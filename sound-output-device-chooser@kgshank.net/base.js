/*******************************************************************************
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 * *****************************************************************************
 * Original Author: Gopi Sankar Karmegam
 ******************************************************************************/
/* jshint moz:true */

const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const VolumeMenu = imports.ui.status.volume;
const { Atk, St, GObject, GLib } = imports.gi;

const Gvc = imports.gi.Gvc;
const ExtensionUtils = imports.misc.extensionUtils;
const Config = imports.misc.config;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.convenience;
const _d = Lib._log;
const Prefs = Me.imports.prefs;
const SignalManager = Lib.SignalManager;

function _isDeviceInValid(uidevice) {
    return (!uidevice || (uidevice.description != null && uidevice.description.match(/Dummy\s+(Output|Input)/gi)));
}

function getMixerControl() {
    return VolumeMenu.getMixerControl();
}

var ProfileMenuItem = class ProfileMenuItem
    extends PopupMenu.PopupMenuItem {
    constructor(id, title, profileName, callback) {
        super(title);
        this._init(id, title, profileName, callback);
    }

    _init(id, title, profileName, callback) {
        if (super._init) {
            super._init(title);
        }
        _d("ProfileMenuItem: _init:" + title);
        this.id = id;
        this.profileName = profileName;
        this._ornamentLabel.set_style("min-width: 3em;margin-left: 3em;");
        this.setProfileActive(false);
        this.connect('activate', () => {
            _d("Activating Profile:" + id + profileName);
            callback(this.id, this.profileName);
        });
    }

    setProfileActive(active) {
        if (active) {
            this.setOrnament(PopupMenu.Ornament.DOT);
            // this._ornamentLabel.text = "\u2727";
            this._ornamentLabel.text = "\u266A";
            if (this.add_style_pseudo_class) {
                this.remove_style_pseudo_class('insensitive');
            }
            else {
                this.actor.remove_style_pseudo_class('insensitive');
            }
        }
        else {
            this.setOrnament(PopupMenu.Ornament.NONE);
            if (this.add_style_pseudo_class) {
                this.add_style_pseudo_class('insensitive');
            }
            else {
                this.actor.add_style_pseudo_class('insensitive');
            }
        }
    }

    setVisibility(visibility) {
        this.actor.visible = visibility;
    }
}

var SoundDeviceMenuItem = class SoundDeviceMenuItem extends PopupMenu.PopupImageMenuItem {
    constructor(id, title, icon_name, profiles, callback, profileCallback) {
        super(title, icon_name);
        this._init(id, title, icon_name, profiles, callback, profileCallback);
    }

    _init(id, title, icon_name, profiles, callback, profileCallback) {
        if (super._init) {
            super._init(title, icon_name);
        }
        _d("SoundDeviceMenuItem: _init:" + title);
        this.id = id;
        this.title = title;
        this.icon_name = icon_name;
        this.profiles = (profiles) ? profiles : [];

        this.profilesitems = new Map();
        for (let profile of this.profiles) {
            if (!this.profilesitems.has(profile.name)) {
                this.profilesitems.set(profile.name, new ProfileMenuItem(id, "Profile: " + profile.human_name, profile.name, profileCallback));
            }
        }

        this.connect('activate', () => {
            _d("Device Change request for " + id);
            callback(this.id);
        });
        this.available = true;
        this.activeProfile = "";
        this.activeDevice = false;
        this.visible = false;
    }

    isAvailable() {
        return this.available;
    }

    setAvailable(_ac) {
        this.available = _ac;
    }

    setActiveProfile(_p) {
        if (_p && this.activeProfile != _p) {
            if (this.profilesitems.has(this.activeProfile)) {
                this.profilesitems.get(this.activeProfile).setProfileActive(false);
            }
            this.activeProfile = _p;
            if (this.profilesitems.has(_p)) {
                this.profilesitems.get(_p).setProfileActive(true);
            }
        }
    }

    setVisibility(_v) {
        this.actor.visible = _v;
        if (!_v) {
            this.profilesitems.forEach((p) => p.setVisibility(false));
        }
        this.visible = _v;
    };

    isVisible() {
        return this.visible;
    }

    setActiveDevice(_a) {
        this.activeDevice = _a;
        if (!_a) {
            this.setOrnament(PopupMenu.Ornament.NONE);
        }
        else {
            this.setOrnament(PopupMenu.Ornament.CHECK);
            this._ornamentLabel.text = '\u266B';
        }
    }

    setProfileVisibility(_v) {
        this.profilesitems.forEach(p =>
            p.setVisibility(_v && this.canShowProfile()));
    }

    canShowProfile() {
        return (this.isVisible() && this.profilesitems.size > 1);
    }
}

if (parseFloat(Config.PACKAGE_VERSION) >= 3.34) {
    ProfileMenuItem = GObject.registerClass({ GTypeName: 'ProfileMenuItem' }, ProfileMenuItem);

    SoundDeviceMenuItem = GObject.registerClass({ GTypeName: 'SoundDeviceMenuItem' }, SoundDeviceMenuItem);
}

var SoundDeviceChooserBase = class SoundDeviceChooserBase {

    constructor(deviceType) {
        _d("SDC: init");
        this.menuItem = new PopupMenu.PopupSubMenuMenuItem('Extension initialising...', true);
        this.deviceType = deviceType;
        this._devices = new Map();
        let _control = this._getMixerControl();
        this._settings = Lib.getSettings(Prefs.SETTINGS_SCHEMA);
        _d("Constructor:" + deviceType);

        this._setLog();
        this._signalManager = new SignalManager();
        this._signalManager.addSignal(this._settings, "changed::" + Prefs.ENABLE_LOG, this._setLog.bind(this));

        if (_control.get_state() == Gvc.MixerControlState.READY) {
            this._onControlStateChanged(_control);
        }
        else {
            this._controlStateChangeSignal = this._signalManager.addSignal(_control, "state-changed", this._onControlStateChanged.bind(this));
        }
    }

    _getMixerControl() { return getMixerControl(); }

    _setLog() { Lib.setLog(this._settings.get_boolean(Prefs.ENABLE_LOG)); }

    _onControlStateChanged(control) {
        if (control.get_state() == Gvc.MixerControlState.READY) {
            if (!this._initialised) {
                this._initialised = true;

                this._signalManager.addSignal(control, this.deviceType + "-added", this._deviceAdded.bind(this));
                this._signalManager.addSignal(control, this.deviceType + "-removed", this._deviceRemoved.bind(this));
                this._signalManager.addSignal(control, "active-" + this.deviceType + "-update", this._deviceActivated.bind(this));

                this._signalManager.addSignal(this._settings, "changed::" + Prefs.HIDE_ON_SINGLE_DEVICE, this._setChooserVisibility.bind(this));
                this._signalManager.addSignal(this._settings, "changed::" + Prefs.SHOW_PROFILES, this._setProfileVisibility.bind(this));
                this._signalManager.addSignal(this._settings, "changed::" + Prefs.ICON_THEME, this._setIcons.bind(this));
                this._signalManager.addSignal(this._settings, "changed::" + Prefs.HIDE_MENU_ICONS, this._setIcons.bind(this));
                this._signalManager.addSignal(this._settings, "changed::" + Prefs.PORT_SETTINGS, this._resetDevices.bind(this));

                this._show_device_signal = Prefs["SHOW_" + this.deviceType.toUpperCase() + "_DEVICES"];

                this._signalManager.addSignal(this._settings, "changed::" + this._show_device_signal, this._setVisibility.bind(this));

                this._portsSettings = Prefs.getPortsFromSettings(this._settings);

                /**
                 * There is no direct way to get all the UI devices from
                 * mixercontrol. When enabled after shell loads, the signals
                 * will not be emitted, a simple hack to look for ids, until any
                 * uidevice is not found. The UI devices are always serialed
                 * from from 1 to n
                 */

                let id = 0;

                let dummyDevice = new Gvc.MixerUIDevice();
                let maxId = dummyDevice.get_id();

                _d("Max Id:" + maxId);

                while (++id < maxId) {
                    this._deviceAdded(control, id);
                }
                let defaultStream = this.getDefaultStream(control);
                if (defaultStream) {
                    let defaultDevice = control.lookup_device_from_stream(defaultStream);
                    if (defaultDevice) {
                        this._deviceActivated(control, defaultDevice.get_id());
                    }
                }

                let profileVisibility = this._settings.get_boolean(Prefs.SHOW_PROFILES);
                this._setProfileTimer(profileVisibility);

                if (this._controlStateChangeSignal) {
                    this._controlStateChangeSignal.disconnect();
                    delete this._controlStateChangeSignal;
                }
                this._setVisibility();
            }
        }
    }

    _setProfileTimer(v) {
        //We dont have any way to understand that the profile has changed in the settings
        //Just an useless workaround 
        if (v) {
            if (!this.activeProfileTimeout) {
                this.activeProfileTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000,
                    this._setActiveProfile.bind(this));
            }
        }
        else {
            if (this.activeProfileTimeout) {
                GLib.source_remove(this.activeProfileTimeout);
                this.activeProfileTimeout = null;
            }
        }
    }


    _deviceAdded(control, id, dontcheck) {
        let obj = this._devices.get(id);
        let uidevice = this.lookupDeviceById(control, id);

        _d("Added - " + id);

        if (!obj) {
            if (_isDeviceInValid(uidevice)) {
                return null;
            }

            let title = uidevice.description;
            if (uidevice.origin != "")
                title += " - " + uidevice.origin;

            let icon = uidevice.get_icon_name();
            if (icon == null || icon.trim() == "")
                icon = this.getDefaultIcon();
            icon = this._getIcon(icon);

            obj = new SoundDeviceMenuItem(id, title, icon, Lib.getProfiles(control, uidevice), this._changeDeviceBase.bind(this), this._profileChangeCallback.bind(this));

            this.menuItem.menu.addMenuItem(obj);
            obj.profilesitems.forEach(i => this.menuItem.menu.addMenuItem(i));

            this._devices.set(id, obj);
        }
        else if (obj.isAvailable()) {
            return //uidevice;
        }
        else {
            obj.setAvailable(true);
        }

        _d("Device Name:" + obj.title);

        _d("Added: " + id + ":" + uidevice.description + ":" + uidevice.port_name + ":" + uidevice.origin);

        let stream = control.get_stream_from_device(uidevice);
        if (stream) {
            obj.setActiveProfile(uidevice.get_active_profile());
        }

        if (!dontcheck && !this._canShowDevice(control, uidevice, uidevice.port_available)) {
            this._deviceRemoved(control, id, true);
        }

        this._setChooserVisibility();
        this._setVisibility();
        return //uidevice;
    }

    _profileChangeCallback(id, profileName) {
        let control = this._getMixerControl();
        let uidevice = this.lookupDeviceById(control, id);
        if (!uidevice) {
            this._deviceRemoved(control, id);
        }
        else {
            _d("i am setting profile, " + profileName + ":" + uidevice.description + ":" + uidevice.port_name);
            if (id != this._activeDeviceId) {
                _d("Changing active device to " + uidevice.description + ":" + uidevice.port_name);
                this._changeDeviceBase(id, control);
            }
            control.change_profile_on_selected_device(uidevice, profileName);
            this._setDeviceActiveProfile(control, this._devices.get(id));
        }
    }

    _deviceRemoved(control, id, dontcheck) {
        let obj = this._devices.get(id);
        //let uidevice = this.lookupDeviceById(control,id);
        if (obj && obj.isAvailable()) {
            _d("Removed: " + id + ":" + obj.title);
            /*
            if (!dontcheck && this._canShowDevice(control, uidevice, false)) {
                _d('Device removed, but not hiding as its set to be shown always');
                return;
            }*/
            obj.setVisibility(false);
            obj.setAvailable(false);

            /*
            if (this.deviceRemovedTimout) {
                GLib.source_remove(this.deviceRemovedTimout);
                this.deviceRemovedTimout = null;
            }
            */
            /**
             * If the active uidevice is removed, then need to activate the
             * first available uidevice. However for some cases like Headphones,
             * when the uidevice is removed, Speakers are automatically
             * activated. So, lets wait for sometime before activating.
             */
            /* THIS MAY NOT BE NEEDED AS SHELL SEEMS TO ACTIVATE NEXT DEVICE
           this.deviceRemovedTimout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, function() {
               _d("Device Removed timeout");
               if (obj === this._activeDevice) {
                   let device = Object.keys(this._devices).map((id) => this._devices[id]).find(({active}) => active === true);
                   if(device){
                       this._changeDeviceBase(this._getMixerControl(), device.id);
                   }                    
               }
               this.deviceRemovedTimout = null;
               return false;
           }.bind(this));
           */
            this._setChooserVisibility();
            this._setVisibility();
        }
    }

    _deviceActivated(control, id) {
        _d("Activated:- " + id);
        let obj = this._devices.get(id);
        if (!obj) {
            _d("Activated device not found in the list of devices, try to add");
            this._deviceAdded(control, id);
            obj = this._devices.get(id);
        }
        if (obj && id != this._activeDeviceId) {
            _d("Activated: " + id + ":" + obj.title);
            if (this._activeDeviceId) {
                this._devices.get(this._activeDeviceId).setActiveDevice(false);
            }
            this._activeDeviceId = id;
            obj.setActiveDevice(true);

            this.menuItem.label.text = obj.title;

            if (!this._settings.get_boolean(Prefs.HIDE_MENU_ICONS)) {
                this.menuItem.icon.icon_name = obj.icon_name;
            } else {
                this.menuItem.icon.gicon = null;
            }
        }
    }

    _changeDeviceBase(id, control) {
        if (!control) {
            control = this._getMixerControl();
        }
        let uidevice = this.lookupDeviceById(control, id);
        if (uidevice) {
            this.changeDevice(control, uidevice);
        }
        else {
            this._deviceRemoved(control, id);
        }
    }

    _setActiveProfile() {
        if (!this.menuItem._getOpenState()) {
            return;
        }
        let control = this._getMixerControl();
        //_d("Setting Active Profile");
        this._devices.forEach(device => {
            if (device.isAvailable()) {
                this._setDeviceActiveProfile(control, device);
            }
        });
        return true;
    }

    _setDeviceActiveProfile(control, device) {
        if (!device || !device.isAvailable()) {
            return;
        }

        let uidevice = this.lookupDeviceById(control, device.id);
        if (!uidevice) {
            this._deviceRemoved(control, device.id);
        }
        else {
            let activeProfile = uidevice.get_active_profile();
            _d("Active Profile:" + activeProfile);
            device.setActiveProfile(activeProfile);
        }
    }

    _getDeviceVisibility() {
        let hideChooser = this._settings.get_boolean(Prefs.HIDE_ON_SINGLE_DEVICE);
        if (hideChooser) {
            return (Array.from(this._devices.values()).filter(x => x.isAvailable()).length > 1);
        }
        else {
            return true;
        }
    }

    _setChooserVisibility() {
        let visibility = this._getDeviceVisibility();
        Array.from(this._devices.values()).filter(x => x.isAvailable()).forEach(x => x.setVisibility(visibility))

        this.menuItem._triangleBin.visible = visibility;
        this._setProfileVisibility();
    }

    _setProfileVisibility() {
        let visibility = this._settings.get_boolean(Prefs.SHOW_PROFILES);
        Array.from(this._devices.values()).filter(x => x.isAvailable()).forEach(device => device.setProfileVisibility(visibility));
        this._setProfileTimer(visibility);
    }

    _getIcon(name) {
        let iconsType = this._settings.get_string(Prefs.ICON_THEME);
        switch (iconsType) {
            case Prefs.ICON_THEME_COLORED:
                return name;
            case Prefs.ICON_THEME_MONOCHROME:
                return name + "-symbolic";
            default:
                //return "none";
                return null;
        }
    }

    _setIcons() {
        // Set the icons in the selection list
        let control = this._getMixerControl();
        this._devices.forEach((device, id) => {
            let uidevice = this.lookupDeviceById(control, id);
            if (uidevice) {
                let icon = uidevice.get_icon_name();
                if (icon == null || icon.trim() == "")
                    icon = this.getDefaultIcon();
                _d(icon + " _setIcons")
                device.setIcon(this._getIcon(icon));
            }
        });

        // These indicate the active device, which is displayed directly in the
        // Gnome menu, not in the list.
        if (!this._settings.get_boolean(Prefs.HIDE_MENU_ICONS)) {
            this.menuItem.icon.icon_name = this._getIcon(this._devices.get(this._activeDeviceId).icon_name);
        } else {
            this.menuItem.icon.icon_name = null;
        }
    }

    _canShowDevice(control, uidevice, defaultValue) {
        if (!uidevice || !this._portsSettings || uidevice.port_name == null || uidevice.description == null) {
            return defaultValue;
        }
        let stream = control.get_stream_from_device(uidevice);
        let cardName = null;
        if (stream) {
            let cardId = stream.get_card_index();
            if (cardId != null) {
                _d("Card Index" + cardId);
                let _card = Lib.getCard(cardId);
                if (_card) {
                    cardName = _card.name;
                }
                else {
                    //card id found, but not available in list
                    return false;
                }
                _d("Card Name" + cardName);
            }
        }

        for (let port of this._portsSettings) {
            //_d("P" + port.name + "==" + uidevice.port_name + "==" + port.human_name + "==" + uidevice.description + "==" + cardName + "==" + port.card_name)
            if (port && port.name == uidevice.port_name && port.human_name == uidevice.description && (!cardName || cardName == port.card_name)) {
                switch (port.display_option) {
                    case 1:
                        return true;
                    case 2:
                        return false;
                    default:
                        return defaultValue;
                }
            }
        }
        return defaultValue;
    }

    _resetDevices() {
        //this._portsSettings = JSON.parse(this._settings.get_string(Prefs.PORT_SETTINGS));
        this._portsSettings = Prefs.getPortsFromSettings(this._settings);
        let control = this._getMixerControl();
        for (let id of this._devices.keys()) {
            let uidevice = this.lookupDeviceById(control, id);
            if (_isDeviceInValid(uidevice)) {
                _d("Device is invalid");
            }
            else {
                switch (this._canShowDevice(control, uidevice, uidevice.port_available)) {
                    case true:
                        this._deviceAdded(control, id, true);
                        break;
                    case false:
                        this._deviceRemoved(control, id, true);
                        break;
                }
            }
        }
    }

    _setVisibility() {
        if (!this._settings.get_boolean(this._show_device_signal))
            this.menuItem.actor.visible = false;
        else
            // if setting says to show device, check for any device, otherwise
            // hide the "actor"
            this.menuItem.actor.visible = (Array.from(this._devices.values()).some(x => x.isAvailable()));
    }

    destroy() {
        this._signalManager.disconnectAll();
        if (this.deviceRemovedTimout) {
            GLib.source_remove(this.deviceRemovedTimout);
            this.deviceRemovedTimout = null;
        }
        if (this.activeProfileTimeout) {
            GLib.source_remove(this.activeProfileTimeout);
            this.activeProfileTimeout = null;
        }
        this.menuItem.destroy();
    }
};
