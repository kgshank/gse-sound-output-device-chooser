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
 * 
 * Orignal Author: Gopi Sankar Karmegam
 ******************************************************************************/
 /* jshint moz:true */

const Lang = imports.lang;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const VolumeMenu = imports.ui.status.volume;
const St = imports.gi.St;
const Mainloop = imports.mainloop;
const Gvc = imports.gi.Gvc;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.convenience;
const Prefs = Me.imports.prefs;
const SignalManager = Lib.SignalManager;


const SoundDeviceChooserBase = new Lang.Class({
    Name: 'SoundDeviceChooserBase',
    Extends: PopupMenu.PopupSubMenuMenuItem,
    Abstract: true,

    _init: function(deviceType) {
        this.parent('Extension initialising...', true);
        this.deviceType = deviceType;
        this._devices = {};
        this._availableDevicesIds = {};
        this._control = VolumeMenu.getMixerControl();
        this._settings = Lib.getSettings(Prefs.SETTINGS_SCHEMA);
        this._signalManager = new SignalManager();

        if(this._control.get_state() == Gvc.MixerControlState.READY) {
            this._onControlStateChanged();
        }
        else {
            this._controlStateChangeSignal = this._signalManager.addSignal(this._control, "state-changed", Lang.bind(this,this._onControlStateChanged));
        }
    },

    _onControlStateChanged: function() {
        if(this._control.get_state() == Gvc.MixerControlState.READY) {
            if(!this._initialised) {
                this._initialised = true;

                this._signalManager.addSignal(this._control, this.deviceType + "-added", Lang.bind(this,this._deviceAdded));
                this._signalManager.addSignal(this._control, this.deviceType + "-removed", Lang.bind(this,this._deviceRemoved));
                this._signalManager.addSignal(this._control, "active-" + this.deviceType + "-update", Lang.bind(this,this._deviceActivated));

                this._signalManager.addSignal(this._settings,"changed::" + Prefs.HIDE_ON_SINGLE_DEVICE,Lang.bind(this,this._setChooserVisibility) );
                this._signalManager.addSignal(this._settings,"changed::" + Prefs.SHOW_PROFILES , Lang.bind(this,this._setProfileVisibility));
                this._signalManager.addSignal(this._settings,"changed::" + Prefs.ICON_THEME , Lang.bind(this,this._setIcons));
                this._signalManager.addSignal(this._settings,"changed::" + Prefs.HIDE_MENU_ICONS , Lang.bind(this,this._setIcons));
                this._signalManager.addSignal(this._settings,"changed::" + Prefs.PORT_SETTINGS , Lang.bind(this,this._resetDevices));

                this._show_device_signal =  Prefs["SHOW_" + this.deviceType.toUpperCase()  + "_DEVICES"];

                this._signalManager.addSignal(this._settings,"changed::" + this._show_device_signal, Lang.bind(this,this._setVisibility) );

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
                global.log("Max Id:" + maxId);

                let defaultDevice = this.getDefaultDevice();
                while(++id < maxId) {
                    let uidevice = this._deviceAdded(this._control, id);
                    if(uidevice) {
                        let stream = this._control.get_stream_from_device(uidevice);
                        if(stream) {
                            let stream_port = stream.get_port();

                            if(stream_port && stream == defaultDevice && stream_port.port === uidevice.get_port()) {
                                this._deviceActivated(this._control, id);
                            }
                        }
                    }
                }

                this.activeProfileTimeout =  Mainloop.timeout_add(1000, Lang.bind(this,
                        this._setActiveProfile));

                if(this._controlStateChangeSignal) {
                    this._controlStateChangeSignal.disconnect();
                    delete this._controlStateChangeSignal;
                }
                this._setVisibility();
            }
        }
    },

    _deviceAdded: function(control, id, dontcheck) {
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
            	obj.text += "\n(" + uidevice.origin + ")";
            obj.item = this.menu.addAction( obj.text, Lang.bind(this,function() {
                this.changeDevice(uidevice);
            }));

            let icon = uidevice.get_icon_name();
            if(icon == null || icon.trim() == "")
                icon = this.getDefaultIcon();
            obj.item._icon = new St.Icon({ style_class: 'popup-menu-icon',
                icon_name: this._getIcon(icon)});
            obj.item.actor.insert_child_at_index(obj.item._icon,1);
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
        
        global.log(obj.text);
        
        if (obj.profiles) {
            for (let profile of obj.profiles) {
            	global.log(profile.name)
            }
        }

        if(obj.active) {
            return uidevice;
        }

        global.log("Added: " + id + ":" + uidevice.description + ":" + uidevice.port_name);
        this._availableDevicesIds[id] ++;

        obj.active = true;
        obj.activeProfile = uidevice.get_active_profile();
        let showProfiles = this._settings.get_boolean(Prefs.SHOW_PROFILES);
        if (obj.profiles) {
            for (let profile of obj.profiles) {
                let profileItem = obj.profilesitems[profile.name];
                if(!profileItem) {
                    let profileName = profile.name;
                    profileItem = this.menu.addAction( "Profile:" + profile.human_name, Lang.bind(this,function() {
                        this.changeDevice(uidevice);
                        control.change_profile_on_selected_device(uidevice, profileName);
                        this._setDeviceActiveProfile(obj);
                    }));
	
                    obj.profilesitems[profileName] = profileItem;
                    profileItem.setProfileActive = function(active) {
                        if(active) {
                            this._ornamentLabel.text = "\t\u2727";
                        }
                        else {
                            this._ornamentLabel.text = "\t";
                        }
                    };
                    profileItem._ornamentLabel.width = 45;
                }
                profileItem.setProfileActive(obj.activeProfile == profile.name);
            }
        }
        if (!dontcheck  && !this._canShowDevice(uidevice, uidevice.port_available)) {
            this._deviceRemoved(control, id, true);
        }
        this._setChooserVisibility();
        return uidevice;
    },

    _deviceRemoved: function(control, id, dontcheck) {
        let obj = this._devices[id];
        if(obj && obj.active) {
            global.log("Removed: " + id);
            if(!dontcheck && this._canShowDevice(obj.uidevice, false)) {
                global.log('Device removed, but not hiding as its set to be shown always');
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
                Mainloop.source_remove(this.deviceRemovedTimout);
                this.deviceRemovedTimout = null;
            }
            /**
             * If the active uidevice is removed, then need to activate the
             * first available uidevice. However for some cases like Headphones,
             * when the uidevice is removed, Speakers are automatically
             * activated. So, lets wait for sometime before activating.
             */
            this.deviceRemovedTimout = Mainloop.timeout_add(1500, Lang.bind(this,function() {
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
            }));
            this._setChooserVisibility();
        }
    },

    _deviceActivated: function(control, id) {
        let obj = this._devices[id];
        if(obj && obj !== this._activeDevice) {
            global.log("Activated: " + id);
            if(this._activeDevice) {
                this._activeDevice.item.setOrnament(PopupMenu.Ornament.NONE);
            }
            this._activeDevice = obj;
            obj.item.setOrnament(PopupMenu.Ornament.CHECK);
            this.label.text = obj.text;

            if (!this._settings.get_boolean(Prefs.HIDE_MENU_ICONS)) {
                let icon = obj.uidevice.get_icon_name();
                if(icon == null || icon.trim() == "")
                    icon = this.getDefaultIcon();
                this.icon.icon_name = this._getIcon(icon);
            } else {
                this.icon.icon_name = "blank";
            }
        }
    },

    _setActiveProfile: function() {
    	for (let id in this._devices) {
    	    let device = this._devices[id];
    	    if(device.active) {
    	        this._setDeviceActiveProfile(device);
            }
        }
        return true;
    },

    _setDeviceActiveProfile: function(device) {
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
    },

    _getDeviceVisibility: function() {
        let hideChooser = this._settings.get_boolean(Prefs.HIDE_ON_SINGLE_DEVICE);
        if (hideChooser) {
            return (Object.keys(this._availableDevicesIds).length > 1);
        }
        else {
            return true;
        }
    },

    _setChooserVisibility: function() {
        let visibility = this._getDeviceVisibility();
        for (let id in this._availableDevicesIds) {
            this._devices[id].item.actor.visible = visibility;
        }
        this._triangleBin.visible = visibility;
        this._setProfileVisibility();
    },

    _setProfileVisibility: function() {
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
    },

    _getIcon: function(name) {
        let iconsType = this._settings.get_string(Prefs.ICON_THEME);
        switch (iconsType) {
            case Prefs.ICON_THEME_COLORED:
                return name;
            case Prefs.ICON_THEME_MONOCHROME:
                return name + "-symbolic";
            default:
                return "none";
        }
    },

    _setIcons: function() {
        // Set the icons in the selection list
    	for (let id in this._devices) {
    	    let device = this._devices[id];
            let icon = device.uidevice.get_icon_name();
            if(icon == null || icon.trim() == "")
                icon = this.getDefaultIcon();
            device.item._icon.icon_name = this._getIcon(icon);
        }

        // These indicate the active device, which is displayed directly in the
        // Gnome menu, not in the list.
        if (!this._settings.get_boolean(Prefs.HIDE_MENU_ICONS)) {
            let icon = this._activeDevice.uidevice.get_icon_name();
            if(icon == null || icon.trim() == "")
                icon = this.getDefaultIcon();

            this.icon.icon_name = this._getIcon(icon);
        } else {
            this.icon.icon_name = "blank";
        }
    },


    _canShowDevice: function(uidevice, defaultValue) {
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
    },

    _resetDevices: function() {
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
    },

    _setVisibility : function() {
        this.actor.visible =  this._settings.get_boolean(this._show_device_signal);
    },

    destroy: function() {
        this._signalManager.disconnectAll();
        if(this.deviceRemovedTimout) {
            Mainloop.source_remove(this.deviceRemovedTimout);
            this.deviceRemovedTimout = null;
        }
        if(this.activeProfileTimeout) {
            Mainloop.source_remove(this.activeProfileTimeout);
            this.activeProfileTimeout = null;
        }
        this.parent();
    }
});
