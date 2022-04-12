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
 * this program. If not, see http://www.gnu.org/licenses/.
 * *****************************************************************************
 * Original Author: Gopi Sankar Karmegam
 ******************************************************************************/
/* jshint moz:true */

const { GObject, GLib, Gvc } = imports.gi;

const Signals = imports.signals;

const PopupMenu = imports.ui.popupMenu;
const VolumeMenu = imports.ui.status.volume;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Gettext = imports.gettext;

const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.convenience;
const Prefs = Me.imports.prefs;

ExtensionUtils.initTranslations(Me.metadata["gettext-domain"]);
const Domain = Gettext.domain(Me.metadata["gettext-domain"]);
const _ = Domain.gettext;
//const _ = Gettext.gettext;
const _d = Lib._log;
const getActor = Lib.getActor;

const DISPLAY_OPTIONS = Prefs.DISPLAY_OPTIONS;
const SignalManager = Lib.SignalManager;
const isShellAbove34 = (parseFloat(Config.PACKAGE_VERSION) >= 3.34);

var ProfileMenuItem40 = class 
    extends PopupMenu.PopupMenuItem {
	_init(title, profileName) {
        if (super._init) {
            super._init(title);
        }
        _d("ProfileMenuItem: _init:" + title); 
        this._initialise(profileName);       
    }
    
    _initialise(profileName) {
		this.profileName = profileName;
        this._ornamentLabel.set_style("min-width: 3em;margin-left: 3em;");
        this.setProfileActive(false);
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
                getActor(this).remove_style_pseudo_class('insensitive');
            }
        }
        else {
            this.setOrnament(PopupMenu.Ornament.NONE);
            if (this.add_style_pseudo_class) {
                this.add_style_pseudo_class('insensitive');
            }
            else {
                getActor(this).add_style_pseudo_class('insensitive');
            }
        }
    }

    setVisibility(visibility) {
        getActor(this).visible = visibility;
    }
}

var ProfileMenuItem32 = class 
    extends ProfileMenuItem40 {
	constructor(title, profileName){
		_d("ProfileMenuItem: constructor:" + title);
		super(title);
		this._initialise(profileName);		
	}
}

var SoundDeviceMenuItem40 = class extends PopupMenu.PopupImageMenuItem {
	_init(id, title, icon_name, profiles) {
        if (super._init) {
            super._init(title, icon_name);
        }
        _d("SoundDeviceMenuItem: _init:" + title);
        this._initialise(id, title, icon_name, profiles);
    }

    _initialise(id, title, icon_name, profiles) {
        this.id = id;
        this.title = title;
        this.icon_name = icon_name;
        this.profiles = (profiles) ? profiles : [];

        this.profilesitems = new Map();
        for (let profile of this.profiles) {
            let profileName = profile.name;
            if (!this.profilesitems.has(profileName)) {
                let pItem = new ProfileMenuItem(_("Profile: ") + profile.human_name, profileName);
                this.profilesitems.set(profileName, pItem);
                pItem.connect('activate', () => {
                    _d("Activating Profile:" + id + profileName);
                    this.emit("profile-activated", this.id, profileName);
                });
            }
        }

        this.connect('activate', () => {
            _d("Device Change request for " + id);
            _d("Emitting Signal...");
            this.emit("device-activated", this.id);
        });
        this.available = true;
        this.activeProfile = "";
        this.activeDevice = false;
        this._displayOption = DISPLAY_OPTIONS.INITIAL;
        getActor(this).visible = false;
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
        getActor(this).visible = _v;
        if (!_v) {
            this.profilesitems.forEach((p) => p.setVisibility(false));
        }
    };

    setTitle(_t) {
        _d("SoundDeviceMenuItem: " + "setTitle: " + this.title + "->" + _t);
        this.title = _t;
        this.label.text = _t;
    }

    isVisible() {
        return getActor(this).visible;
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
        return (this.isVisible() && this.profilesitems.size >= 1);
    }

    setDisplayOption(displayOption) {
        _d("Setting Display Option to : " + displayOption);
        this._displayOption = displayOption;
    }

    getDisplayOption() {
        return this._displayOption;
    }
}

var SoundDeviceMenuItem32 = class extends SoundDeviceMenuItem40 {
	constructor(id, title, icon_name, profiles) {
        _d("SoundDeviceMenuItem: constructor:" + title);
       	super(title, icon_name);
		this._initialise(id, title, icon_name, profiles);        
 	}
}

var SoundDeviceMenuItem;
var ProfileMenuItem;
if (isShellAbove34) {
	SoundDeviceMenuItem = SoundDeviceMenuItem40;
	ProfileMenuItem = ProfileMenuItem40;
    ProfileMenuItem = GObject.registerClass({ GTypeName: 'ProfileMenuItem' }, ProfileMenuItem);

    SoundDeviceMenuItem = GObject.registerClass({
        GTypeName: "SoundDeviceMenuItem",
        Signals: {
            "device-activated": {
                param_types: [GObject.TYPE_INT]
            },
            "profile-activated": {
                param_types: [GObject.TYPE_INT, GObject.TYPE_STRING]
            }
        }
    }, SoundDeviceMenuItem);
}
else
{
	SoundDeviceMenuItem = SoundDeviceMenuItem32;
	ProfileMenuItem = ProfileMenuItem32;
}

var SoundDeviceChooserBase = class SoundDeviceChooserBase {
    constructor(deviceType) {
        _d("SDC: init");
        this.menuItem = new PopupMenu.PopupSubMenuMenuItem(_("Extension initialising..."), true);
        this.deviceType = deviceType;
        this._devices = new Map();
        let _control = this._getMixerControl();
        this._settings = ExtensionUtils.getSettings();
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

        this._signalManager.addSignal(this.menuItem.menu, "open-state-changed", this._onSubmenuOpenStateChanged.bind(this));
        this._signalManager.addSignal(this.menuItem, "notify::visible", () => {this.emit('update-visibility', getActor(this.menuItem).visible);});
    }

    _getMixerControl() { return VolumeMenu.getMixerControl(); }

    _setLog() { Lib.setLog(this._settings.get_boolean(Prefs.ENABLE_LOG)); }

    _onControlStateChanged(control) {
        if (control.get_state() == Gvc.MixerControlState.READY) {

            this._signalManager.addSignal(control, this.deviceType + "-added", this._deviceAdded.bind(this));
            this._signalManager.addSignal(control, this.deviceType + "-removed", this._deviceRemoved.bind(this));
            this._signalManager.addSignal(control, "active-" + this.deviceType + "-update", this._deviceActivated.bind(this));

            this._signalManager.addSignal(this._settings, "changed::" + Prefs.HIDE_ON_SINGLE_DEVICE, this._setChooserVisibility.bind(this));
            this._signalManager.addSignal(this._settings, "changed::" + Prefs.SHOW_PROFILES, this._setProfileVisibility.bind(this));
            this._signalManager.addSignal(this._settings, "changed::" + Prefs.ICON_THEME, this._setIcons.bind(this));
            this._signalManager.addSignal(this._settings, "changed::" + Prefs.HIDE_MENU_ICONS, this._setIcons.bind(this));
            this._signalManager.addSignal(this._settings, "changed::" + Prefs.PORT_SETTINGS, this._resetDevices.bind(this));
            this._signalManager.addSignal(this._settings, "changed::" + Prefs.OMIT_DEVICE_ORIGIN, this._refreshDeviceTitles.bind(this));

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

            if (this._controlStateChangeSignal) {
                this._controlStateChangeSignal.disconnect();
                delete this._controlStateChangeSignal;
            }
            this._setVisibility();
        }
    }

    _onSubmenuOpenStateChanged(_menu, opened) {
        _d(this.deviceType + "-Submenu is now open?: " + opened);
        if (opened) {   // Actions when submenu is opening
            this._setActiveProfile();
        }
        else {          // Actions when submenu is closing
        }
    }

    _deviceAdded(control, id, dontcheck) {
        let obj = this._devices.get(id);
        let uidevice = this.lookupDeviceById(control, id);

        _d("Added - " + id);

        if (!obj) {
            if (this._isDeviceInValid(uidevice)) {
                return null;
            }

            let title = this._getDeviceTitle(uidevice);

            let icon = uidevice.get_icon_name();
            if (icon == null || icon.trim() == "")
                icon = this.getDefaultIcon();
            icon = this._getIcon(icon);

            obj = new SoundDeviceMenuItem(id, title, icon, Lib.getProfiles(control, uidevice));
            obj.connect("device-activated", (item, id) => this._changeDeviceBase(id));
            obj.connect("profile-activated", (item, id, name) => this._profileChangeCallback(id, name));

            this.menuItem.menu.addMenuItem(obj);
            obj.profilesitems.forEach(i => this.menuItem.menu.addMenuItem(i));

            this._devices.set(id, obj);
        }
        else if (!obj.isAvailable())
            obj.setAvailable(true);
        else
            return;


        _d("Device Name:" + obj.title);

        _d("Added: " + id + ":" + uidevice.description + ":" + uidevice.port_name + ":" + uidevice.origin);

        let stream = control.get_stream_from_device(uidevice);
        if (stream) {
            obj.setActiveProfile(uidevice.get_active_profile());
        }

        if (!dontcheck && !this._canShowDevice(control, uidevice, obj, uidevice.port_available)) {
            _d("This device is hidden in settings, lets hide...")
            this._deviceRemoved(control, id, true);
        }
        else {
            this._setChooserVisibility();
            this._setVisibility();
        }
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
            //this._setDeviceActiveProfile(control, this._devices.get(id)); //"Races" change_profile_...(...) and reports the old state
        }
    }

    _deviceRemoved(control, id, dontcheck) {
        let obj = this._devices.get(id);

        if (obj && obj.isAvailable()) {
            _d("Removed: " + id + ":" + obj.title);
            /*
            let uidevice = this.lookupDeviceById(control,id);
            if (!dontcheck && this._canShowDevice(control, uidevice, obj, false)) {
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
                       this._changeDeviceBase(device.id, this._getMixerControl());
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
            if (this._settings.get_boolean(Prefs.CANNOT_ACTIVATE_HIDDEN_DEVICE)
                && obj.getDisplayOption() === DISPLAY_OPTIONS.HIDE_ALWAYS) {
                _d("Preference does not allow this hidden device to be activated, fallback to the previous aka original device");
                let device = null;

                if (this._activeDeviceId) {
                    device = this._devices.get(this._activeDeviceId);
                }
                else {
                    device = Array.from(this._devices.values()).find(x => x.isAvailable());
                }

                if (device) {
                    _notify(Me.metadata["name"] + " " + _("Extension changed active sound device."),
                        _("Activated device is hidden in Port Settings.") + " \n" +
                        _("Deactivated Device: ") + obj.title + " \n" + _("Activated Device: ") + device.title + " \n"
                        + _("Disable in extension preferences to avoid this behaviour."),
                        device.icon_name);
                    this._changeDeviceBase(device.id, control);
                }
                else {
                    this._activateDeviceMenuItem(control, id, obj);
                }

            }
            else {
                this._activateDeviceMenuItem(control, id, obj);
            }
        }
    }

    _activateDeviceMenuItem(control, id, obj) {
        let prevActiveDevce = this._activeDeviceId;
        this._activeDeviceId = id;
        if (prevActiveDevce) {
            let prevObj = this._devices.get(prevActiveDevce);
            if (prevObj) {
                prevObj.setActiveDevice(false);
                if (prevObj.getDisplayOption() === DISPLAY_OPTIONS.HIDE_ALWAYS) {
                    _d("Hiding previously activated device as it is set to hidden always");
                    this._deviceRemoved(control, prevActiveDevce, true);
                }
            }
        }
        obj.setActiveDevice(true);
        if (!obj.isAvailable()) {
            _d("Activated device hidden, try to add");
            this._deviceAdded(control, id);
        }

        this.menuItem.label.text = obj.title;

        if (!this._settings.get_boolean(Prefs.HIDE_MENU_ICONS)) {
            this.menuItem.icon.icon_name = obj.icon_name;
        } else {
            this.menuItem.icon.gicon = null;
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
        let control = this._getMixerControl();
        this._devices.forEach(device => {
            if (device.isAvailable()) {
                this._setDeviceActiveProfile(control, device);
            }
        });
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

    _getAvailableDevices() {
        return Array.from(this._devices.values()).filter(x => x.isAvailable());
    }

    _getDeviceVisibility() {
        let hideChooser = this._settings.get_boolean(Prefs.HIDE_ON_SINGLE_DEVICE);
        let numAvailableDevices = this._getAvailableDevices().length;
        if (hideChooser) {
            return numAvailableDevices > 1;
        }
        else {
            return numAvailableDevices > 0;
        }
    }

    _setChooserVisibility() {
        let visibility = this._getDeviceVisibility();
        this._getAvailableDevices().forEach(x => x.setVisibility(visibility))

        //getActor(this.menuItem._triangleBin).visible = visibility;
        //getActor(this.menuItem).visible = visibility;
        this._setProfileVisibility();
        this.setVisible(visibility);
    }

    _setVisibility() {
        if (!this._settings.get_boolean(this._show_device_signal))
            this.setVisible(false);
        else
            // if setting says to show device, check for any device, otherwise
            // hide the "actor"
            this.setVisible(this._getDeviceVisibility());        
    }
    
    setVisible(visibility) {
        getActor(this.menuItem).visible = visibility;
        //this.emit('update-visibility', visibility);    
    }

    _setProfileVisibility() {
        let visibility = this._settings.get_boolean(Prefs.SHOW_PROFILES);
        this._getAvailableDevices().forEach(device => device.setProfileVisibility(visibility));
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

    _getDeviceDisplayOption(control, uidevice, obj) {
        let displayOption = DISPLAY_OPTIONS.DEFAULT;
        if (uidevice && uidevice.port_name != null && uidevice.description != null) {
            let stream = control.get_stream_from_device(uidevice);
            let cardName = null;
            if (stream) {
                let cardId = stream.get_card_index();
                if (cardId != null) {
                    _d("Card Index:" + cardId);
                    let _card = Lib.getCard(cardId);
                    if (_card) {
                        cardName = _card.name;
                    }
                    else {
                        //card id found, but not available in list
                        return DISPLAY_OPTIONS.DEFAULT;
                    }
                    _d("Card Name:" + cardName);
                }
            }

            _d("P:" + uidevice.port_name + "==" + uidevice.description + "==" + cardName + "==" + uidevice.origin);

            let matchedPort = this._portsSettings.find(port => (port
                && port.name == uidevice.port_name
                && port.human_name == uidevice.description
                && (!cardName || port.card_name == cardName)
                && (cardName || port.card_description == uidevice.origin)));

            if (matchedPort) {
                displayOption = matchedPort.display_option;
            }
        }

        obj && obj.setDisplayOption(displayOption);

        return displayOption;
    }

    _canShowDevice(control, uidevice, obj, defaultValue) {
        if (!uidevice || !this._portsSettings || uidevice.port_name == null
            || uidevice.description == null || (this._activeDeviceId && this._activeDeviceId == uidevice.get_id())) {
            return defaultValue;
        }

        let displayOption = obj.getDisplayOption();
        if (displayOption === DISPLAY_OPTIONS.INITIAL) {
            displayOption = this._getDeviceDisplayOption(control, uidevice, obj);
        }

        if (displayOption === DISPLAY_OPTIONS.SHOW_ALWAYS) {
            _d("Display Device due Preference:" + displayOption);
            return true;
        }
        else if (displayOption === DISPLAY_OPTIONS.HIDE_ALWAYS) {
            _d("Hide Device due Preference:" + displayOption);
            return false;
        }
        else {
            _d("Default Device due Preference:" + displayOption);
            return defaultValue;
        }
    }

    _resetDevices() {
        this._portsSettings = Prefs.getPortsFromSettings(this._settings);
        let control = this._getMixerControl();
        this._devices.forEach((device, id) => {
            device.setDisplayOption(DISPLAY_OPTIONS.INITIAL);
            let uidevice = this.lookupDeviceById(control, id);
            if (this._isDeviceInValid(uidevice))
                _d("Device is invalid");
            else if (this._canShowDevice(control, uidevice, device, uidevice.port_available))
                this._deviceAdded(control, id, true);
            else
                this._deviceRemoved(control, id, true);
        });
    }

    _isDeviceInValid(uidevice) {
        return (!uidevice || (uidevice.description != null && uidevice.description.match(/Dummy\s+(Output|Input)/gi)));
    }

    _refreshDeviceTitles() {
        let control = this._getMixerControl();
        this._devices.forEach((device, id) => {
            let uidevice = this.lookupDeviceById(control, id);
            let title = this._getDeviceTitle(uidevice);

            device.setTitle(title);
        });

        let activeDevice = this._devices.get(this._activeDeviceId);
        this.menuItem.label.text = activeDevice.title;
    }

    _getDeviceTitle(uidevice) {
        let title = uidevice.description;
        if (!this._settings.get_boolean(Prefs.OMIT_DEVICE_ORIGIN) && uidevice.origin != "")
            title += " - " + uidevice.origin;

        return title;
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

Signals.addSignalMethods(SoundDeviceChooserBase.prototype);

function _notify(msg, details, icon_name) {
    let source = new MessageTray.Source(Me.metadata["name"], icon_name);
    Main.messageTray.add(source);
    let notification = new MessageTray.Notification(source, msg, details);
    //notification.setTransient(true);
    source.showNotification(notification);
}
