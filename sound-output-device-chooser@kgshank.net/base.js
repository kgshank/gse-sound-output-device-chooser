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
const {Atk, St, GObject, GLib} = imports.gi;

const Gvc = imports.gi.Gvc;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.convenience;
const _d = Lib.log;
const Prefs = Me.imports.prefs;
const SignalManager = Lib.SignalManager;


var SoundDeviceChooserBase = class SoundDeviceChooserBase{

    constructor(deviceType) {
        _d("SDC: init");
        this.menuItem = new PopupMenu.PopupSubMenuMenuItem ('Extension initialising...', true);
        this.deviceType = deviceType;
        this._devices = {};
        this._availableDevicesIds = {};
        this._control = VolumeMenu.getMixerControl();
        this._settings = Lib.getSettings(Prefs.SETTINGS_SCHEMA);
        _d("Constructor" + deviceType);

        this._setLog();
        this._signalManager = new SignalManager();
        this._signalManager.addSignal(this._settings,"changed::" + Prefs.ENABLE_LOG, this._setLog.bind(this));        

        if(this._control.get_state() == Gvc.MixerControlState.READY) {
            this._onControlStateChanged();
        }
        else {
            this._controlStateChangeSignal = this._signalManager.addSignal(this._control, "state-changed", this._onControlStateChanged.bind(this));
        }
    }

    _setLog(){ Lib.setLog(this._settings.get_boolean(Prefs.ENABLE_LOG));}    

    _onControlStateChanged() {
        if(this._control.get_state() == Gvc.MixerControlState.READY) {
            if(!this._initialised) {
                this._initialised = true;

                this._signalManager.addSignal(this._control, this.deviceType + "-added", this._deviceAdded.bind(this));
                this._signalManager.addSignal(this._control, this.deviceType + "-removed", this._deviceRemoved.bind(this));
                this._signalManager.addSignal(this._control, "active-" + this.deviceType + "-update", this._deviceActivated.bind(this));

                this._signalManager.addSignal(this._settings,"changed::" + Prefs.HIDE_ON_SINGLE_DEVICE,this._setChooserVisibility.bind(this) );
                this._signalManager.addSignal(this._settings,"changed::" + Prefs.SHOW_PROFILES , this._setProfileVisibility.bind(this));
                this._signalManager.addSignal(this._settings,"changed::" + Prefs.ICON_THEME , this._setIcons.bind(this));
                this._signalManager.addSignal(this._settings,"changed::" + Prefs.HIDE_MENU_ICONS , this._setIcons.bind(this));
                this._signalManager.addSignal(this._settings,"changed::" + Prefs.PORT_SETTINGS , this._resetDevices.bind(this));

                this._show_device_signal =  Prefs["SHOW_" + this.deviceType.toUpperCase()  + "_DEVICES"];

                this._signalManager.addSignal(this._settings,"changed::" + this._show_device_signal, this._setVisibility.bind(this));

                this._portsSettings = JSON.parse(this._settings.get_string(Prefs.PORT_SETTINGS));

                /**
                 * There is no direct way to get all the UI devices from
                 * mixercontrol. When enabled after shell loads, the signals
                 * will not be emitted, a simple hack to look for ids, until any
                 * uidevice is not found. The UI devices are always serialed
                 * from from 1 to n
                 */

                let id = 0;
                let maxId = -1;
                let dummyDevice = new Gvc.MixerUIDevice();
                maxId = dummyDevice.get_id();
                _d("Max Id:" + maxId);

                let defaultDevice = this.getDefaultDevice();
                while(++id < maxId) {
                    let uidevice = this._deviceAdded(this._control, id);
                    if(uidevice) {
                        let stream = this._control.get_stream_from_device(uidevice);
                        if(stream) {
                            let stream_port = stream.get_port();
                            let uidevice_port = uidevice.get_port();

                            if(((!stream_port && !uidevice_port) ||
                                    (stream_port && stream_port.port === uidevice_port)) &&
                                    stream == defaultDevice) {
                                this._deviceActivated(this._control, id);
                            }
                        }
                    }
                }

                this.activeProfileTimeout =  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, 
                        this._setActiveProfile.bind(this));

                if(this._controlStateChangeSignal) {
                    this._controlStateChangeSignal.disconnect();
                    delete this._controlStateChangeSignal;
                }
                this._setVisibility();
            }
        }
    }

    _deviceAdded(control, id, dontcheck) {
        let obj = this._devices[id];
        let uidevice = null;

        if(!obj) {
            uidevice = this.lookupDeviceById(id);
            if(!uidevice) {
                return null;
            }
            obj = new Object();
            obj.uidevice = uidevice;
            obj.text = uidevice.description;
            if(uidevice.origin != "")
                obj.text += " (" + uidevice.origin + ")";

            /*
             * obj.item = this.menu.addAction( obj.text, function() {
             * this.changeDevice(uidevice); }.bind(this)); let icon =
             * uidevice.get_icon_name(); if(icon == null || icon.trim() == "")
             * icon = this.getDefaultIcon(); obj.item._icon = new St.Icon({
             * style_class: 'popup-menu-icon', icon_name: this._getIcon(icon)});
             * obj.item.actor.insert_child_at_index(obj.item._icon,1);
             */

            let icon = uidevice.get_icon_name();
            if(icon == null || icon.trim() == "")
                icon = this.getDefaultIcon();
            let icon_name = this._getIcon(icon);            

            obj.item = this.menuItem.menu.addAction( obj.text, function() {
                this.changeDevice(uidevice);
            }.bind(this), icon_name);

            if(!obj.profiles) {
                obj.profiles = Lib.getProfiles(control, uidevice);
            }

            if(!obj.profilesitems) {
                obj.profilesitems = [];
            }
            this._devices[id] = obj;
        }
        else {
            uidevice = obj.uidevice;
        }

        _d("Device Name:" + obj.text);

        if (obj.profiles) {
            for (let profile of obj.profiles) {
                _d("Profile:" + profile.name);
            }
        }

        if(obj.active) {
            return uidevice;
        }

        _d("Added: " + id + ":" + uidevice.description + ":" + uidevice.port_name);
        if(!this._availableDevicesIds[id]){
            this._availableDevicesIds[id] = 0;
        }
        this._availableDevicesIds[id] ++;

        obj.active = true;
        obj.activeProfile = uidevice.get_active_profile();
        let showProfiles = this._settings.get_boolean(Prefs.SHOW_PROFILES);
        if (obj.profiles) {
            for (let profile of obj.profiles) {
                let profileItem = obj.profilesitems[profile.name];
                if(!profileItem) {
                    let profileName = profile.name;
                    profileItem = this.menuItem.menu.addAction( "Profile: " + profile.human_name, function() {
                        _d("i am setting profile, " + profile.human_name + ":" + uidevice.description + ":" + uidevice.port_name);
                        if(this._activeDevice && this._activeDevice.uidevice !== uidevice) {
                            _d("Changing active device to " + uidevice.description + ":" + uidevice.port_name);
                            this.changeDevice(uidevice);
                        }
                        this._control.change_profile_on_selected_device(uidevice, profileName);
                        this._setDeviceActiveProfile(obj);
                    }.bind(this));

                    obj.profilesitems[profileName] = profileItem;
                    profileItem.setProfileActive = function(active) {
                        if(active) {
                            // this._ornamentLabel.text = "\u2727";
                            this._ornamentLabel.text = "\u266A";
                            if(this.add_style_pseudo_class) {
                                this.add_style_pseudo_class('checked');
                                this.remove_style_pseudo_class('insensitive');
                            }
                            else {
                                this.actor.add_style_pseudo_class('checked');
                                this.actor.remove_style_pseudo_class('insensitive');
                            }
                        }
                        else {
                            this._ornamentLabel.text = "";
                            if(this.add_style_pseudo_class) {
                                this.remove_style_pseudo_class('checked');
                                this.add_style_pseudo_class('insensitive');
                            }
                            else {
                                this.actor.remove_style_pseudo_class('checked');
                                this.actor.add_style_pseudo_class('insensitive');
                            }
                        }
                    };
                    // profileItem._ornamentLabel.width = "500em";
                    profileItem._ornamentLabel.set_style("min-width: 3em;margin-left: 3em;");
                }
                profileItem.setProfileActive(obj.activeProfile == profile.name);
            }
        }
        if (!dontcheck  && !this._canShowDevice(uidevice, uidevice.port_available)) {
            this._deviceRemoved(control, id, true);
        }
        this._setChooserVisibility();
        this._setVisibility();
        return uidevice;
    }

    _deviceRemoved(control, id, dontcheck) {
        let obj = this._devices[id];
        if(obj && obj.active) {
            _d("Removed: " + id);
            if(!dontcheck && this._canShowDevice(obj.uidevice, false)) {
                _d('Device removed, but not hiding as its set to be shown always');
                return;
            }
            delete this._availableDevicesIds[id] ;
            obj.item.actor.visible = false;
            obj.active = false;
            if (obj.profiles) {
                for (let profile of obj.profiles) {
                    let profileItem = obj.profilesitems[profile.name];
                    if(profileItem) {
                        profileItem.actor.visible = false;
                    }
                }
            }

            if(this.deviceRemovedTimout) {
                GLib.source_remove(this.deviceRemovedTimout);
                this.deviceRemovedTimout = null;
            }
            /**
             * If the active uidevice is removed, then need to activate the
             * first available uidevice. However for some cases like Headphones,
             * when the uidevice is removed, Speakers are automatically
             * activated. So, lets wait for sometime before activating.
             */
            this.deviceRemovedTimout = GLib.timeout_add(GLib.PRIORITY_DEFAULT,1500, function() {
                if (obj === this._activeDevice) {
                    for ( let id in this._devices) {
                        let device = this._devices[id];
                        if(device.active == true) {
                            this.changeDevice(device.uidevice);
                            break;
                        }
                    }
                }
                this.deviceRemovedTimout = null;
                return false;
            }.bind(this));
            this._setChooserVisibility();
            this._setVisibility();
        }
    }

    _deviceActivated(control, id) {
        let obj = this._devices[id];
        if(obj && obj !== this._activeDevice) {
            _d("Activated: " + id);
            if(this._activeDevice) {
                this._activeDevice.item.setOrnament(PopupMenu.Ornament.NONE);
                if(this._activeDevice.item.remove_style_pseudo_class) {
                    this._activeDevice.item.remove_style_pseudo_class('checked');
                }
                else {
                    this._activeDevice.item.actor.remove_style_pseudo_class('checked');
                }
            }
            this._activeDevice = obj;
            obj.item.setOrnament(PopupMenu.Ornament.CHECK);
            if(obj.item.add_style_pseudo_class) {
                obj.item.add_style_pseudo_class('checked');
            }
            else {
                obj.item.actor.add_style_pseudo_class('checked');
            }

            obj.item._ornamentLabel.text = '\u266B';
            this.menuItem.label.text = obj.text;

            if (!this._settings.get_boolean(Prefs.HIDE_MENU_ICONS)) {
                let icon = obj.uidevice.get_icon_name();
                if(icon == null || icon.trim() == "")
                    icon = this.getDefaultIcon();
                this.menuItem.icon.icon_name = this._getIcon(icon);
            } else {
                this.menuItem.icon.icon_name = "blank";
            }
        }
    }

    _setActiveProfile() {
        for (let id in this._devices) {
            let device = this._devices[id];
            if(device.active) {
                this._setDeviceActiveProfile(device);
            }
        }
        return true;
    }

    _setDeviceActiveProfile(device) {
        if (!device.uidevice.port_name) {
            return;
        }
        let activeProfile = device.uidevice.get_active_profile();
        if(activeProfile && device.activeProfile != activeProfile) {
            device.activeProfile = activeProfile;
            for (let profile of device.profiles) {
                device.profilesitems[profile.name].setProfileActive(profile.name == device.activeProfile);
            }
        }
    }

    _getDeviceVisibility() {
        let hideChooser = this._settings.get_boolean(Prefs.HIDE_ON_SINGLE_DEVICE);
        if (hideChooser) {
            return (Object.keys(this._availableDevicesIds).length > 1);
        }
        else {
            return true;
        }
    }

    _setChooserVisibility() {
        let visibility = this._getDeviceVisibility();
        for (let id in this._availableDevicesIds) {
            this._devices[id].item.actor.visible = visibility;
        }
        this.menuItem._triangleBin.visible = visibility;
        this._setProfileVisibility();
    }

    _setProfileVisibility() {
        let visibility = this._settings.get_boolean(Prefs.SHOW_PROFILES);
        for (let id in this._availableDevicesIds) {
            let device = this._devices[id];
            if ( device.profiles ) {
                for (let profile of device.profiles) {
                    device.profilesitems[profile.name].actor.visible =
                        (visibility && device.item.actor.visible && Object.keys(device.profilesitems).length > 1);
                }
            }
        }
    }

    _getIcon(name) {
        let iconsType = this._settings.get_string(Prefs.ICON_THEME);
        switch (iconsType) {
        case Prefs.ICON_THEME_COLORED:
            return name;
        case Prefs.ICON_THEME_MONOCHROME:
            return name + "-symbolic";
        default:
            return "none";
        }
    }

    _setIcons() {
        // Set the icons in the selection list
        for (let id in this._devices) {
            let device = this._devices[id];
            let icon = device.uidevice.get_icon_name();
            if(icon == null || icon.trim() == "")
                icon = this.getDefaultIcon();
            // device.item._icon.icon_name = this._getIcon(icon);
            device.item.setIcon(this._getIcon(icon));
        }

        // These indicate the active device, which is displayed directly in the
        // Gnome menu, not in the list.
        if (!this._settings.get_boolean(Prefs.HIDE_MENU_ICONS)) {
            let icon = this._activeDevice.uidevice.get_icon_name();
            if(icon == null || icon.trim() == "")
                icon = this.getDefaultIcon();

            this.menuItem.icon.icon_name = this._getIcon(icon);
        } else {
            this.menuItem.icon.icon_name = "blank";
        }
    }


    _canShowDevice(uidevice, defaultValue) {
        if(!uidevice || !this._portsSettings || uidevice.port_name == null || uidevice.description == null) {
            return defaultValue;
        }

        for (let port of this._portsSettings) {
            if(port && port.name == uidevice.port_name && port.human_name == uidevice.description) {
                switch(port.display_option) {
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
        this._portsSettings = JSON.parse(this._settings.get_string(Prefs.PORT_SETTINGS));
        for (let id in this._devices) {
            let device = this._devices[id];
            let uidevice = device.uidevice;
            if(uidevice.port_name == null || uidevice.description == null) {
                continue;
            }
            switch(this._canShowDevice(uidevice, uidevice.port_available)) {
            case true:
                this._deviceAdded(this._control, uidevice.get_id(), true);
                break;
            case false:
                this._deviceRemoved(this._control, uidevice.get_id(), true);
                break;
            }
        }
    }

    _setVisibility () {
        if (!this._settings.get_boolean(this._show_device_signal))
            this.menuItem.actor.visible = false;
        else
            // if setting says to show device, check for any device, otherwise
            // hide the "actor"
            this.menuItem.actor.visible = (Object.keys(this._availableDevicesIds).length > 0);
    }

    destroy() {
        this._signalManager.disconnectAll();
        if(this.deviceRemovedTimout) {
            GLib.source_remove(this.deviceRemovedTimout);
            this.deviceRemovedTimout = null;
        }
        if(this.activeProfileTimeout) {
            GLib.source_remove(this.activeProfileTimeout);
            this.activeProfileTimeout = null;
        }
        this.menuItem.destroy();
    }
};

