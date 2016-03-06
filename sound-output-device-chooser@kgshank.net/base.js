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
const Lang = imports.lang;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Mainloop = imports.mainloop;
const Gvc = imports.gi.Gvc;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.convenience;
const Prefs = Me.imports.prefs;

const SoundDeviceChooserBase = new Lang.Class({
    Name: 'SoundDeviceChooserBase',
    Extends: PopupMenu.PopupSubMenuMenuItem,
    Abstract: true,

    _init: function(deviceType) {
        this.parent('', true);
        this.deviceType = deviceType;
        this._control = Main.panel.statusArea.aggregateMenu._volume._control;
        this._devices = {};
        this._availableDevicesIds = {};
        let _this = this;
        this._deviceAddedSignal = this._control.connect(deviceType + "-added", function(control,id){_this._deviceAdded(control, id)});
        this._deviceRemovedSignal = this._control.connect(deviceType + "-removed", function(control,id){_this._deviceRemoved(control, id)});
        this._deviceActivatedSignal = this._control.connect("active-" + deviceType + "-update", function(control,id){_this._deviceActivated(control, id)});
        this._settings = Lib.getSettings(Prefs.SETTINGS_SCHEMA);
        this._settings.connect("changed::" + Prefs.HIDE_ON_SINGLE_DEVICE , function(){_this._setChooserVisibility();});
        this._settings.connect("changed::" + Prefs.SHOW_PROFILES , function(){_this._setProfileVisibility();});
        this._settings.connect("changed::" + Prefs.USE_MONOCHROME , function(){_this._setIcons();});
        this._settings.connect("changed::" + Prefs.PORT_SETTINGS , function(){_this._resetDevices();});
        /*
         * this._control.connect("state-changed",
         * function(control,id){global.log('state-changed' + id);});
         * this._control.connect("stream-added",
         * function(control,id){global.log("stream-added" + id);});
         * this._control.connect("stream-removed",
         * function(control,id){global.log("stream-removed" + id);});
         * this._control.connect("card-added",
         * function(control,id){global.log("card-added" + id);});
         * this._control.connect("card-removed",
         * function(control,id){global.log("card-removed" + id);});
         * this._control.connect("default-sink-changed",
         * function(control,id){global.log("default-sink-changed" + id);});
         */
        this._portsSettings = JSON.parse(this._settings.get_string(Prefs.PORT_SETTINGS));
        /**
         * Wait for other devices and shell volume extension, if available to be
         * initialised
         */
        this.initTimeout = Mainloop.timeout_add(3000, Lang.bind(this,
                this._lateInit));
        this.activeProfileTimeout =  Mainloop.timeout_add(3200, Lang.bind(this, 
                this._setActiveProfile));
    },

    _lateInit: function() {
        /**
         * There is no direct way to get all the UI devices from mixercontrol.
         * When enabled after shell loads, the signals will not be emitted, a
         * simple hack to look for ids, until any uidevice is not found. The UI
         * devices are always serialed from from 1 to n
         */
        this.initTimeout = null;
        let defaultDevice = this.getDefaultDevice();
        let id = 0;
        let dummyDevice = new Gvc.MixerUIDevice();

        global.log("Max Id:" + dummyDevice.get_id());
        while(++id <= dummyDevice.get_id())
        {
            let uidevice = this._deviceAdded(this._control, id);
            if(uidevice)// && uidevice.port_available)
            {
                let stream = this._control.get_stream_from_device(uidevice);
                if(stream)
                {
                    let stream_port = stream.get_port();
                
                    if(stream_port && stream == defaultDevice && stream_port.port === uidevice.get_port()) {
                        this._deviceActivated(this._control, id);
                    }
                }
            }            
        }
        let volumeMenu = Main.panel.statusArea.aggregateMenu._volume._volumeMenu;
        let menuItems = volumeMenu._getMenuItems();
        let i=0;
        for (; i < menuItems.length; i++) {
            if (menuItems[i] === volumeMenu._output.item)
            {
                break;
            }
        }
        volumeMenu.addMenuItem(this, i+1);
        return false;    
    },


    _deviceAdded: function(control, id, dontcheck) {
        let obj = this._devices[id];
        let uidevice = null;
        let _this = this;
        if(!obj) {
            uidevice = this.lookupDeviceById(id);
            if(!uidevice)// || !uidevice.port_available)
            {
                return null;
            }
            this._devices[id] = new Object();
            this._devices[id].uidevice = uidevice;
            this._devices[id].text = uidevice.description;
            if(uidevice.origin != "")
            	this._devices[id].text += "\n(" + uidevice.origin + ")";
            this._devices[id].item = this.menu.addAction( this._devices[id].text, function() {
                _this.changeDeviceById(uidevice);
            });

            let icon = uidevice.get_icon_name();
            if(icon == null || icon.trim() == "")
                icon = this.getDefaultIcon();
            this._devices[id].item._icon = new St.Icon({ style_class: 'popup-menu-icon',
                icon_name: (this._settings.get_boolean(Prefs.USE_MONOCHROME)) ? icon + "-symbolic" :  icon});
            this._devices[id].item.actor.insert_child_at_index(this._devices[id].item._icon,1);
            if(!this._devices[id].profiles)
            {
                global.log("Profiles not defined");            
                this._devices[id].profiles = Lib.getProfiles(control, uidevice);
            }

            if(!this._devices[id].profilesitems)
            {            
                this._devices[id].profilesitems = [];
            }
        }
        else
        {
            uidevice = obj.uidevice;
        }

        global.log("Added: " + id + ":" + uidevice.description + ":" + uidevice.port_name);
        this._availableDevicesIds[id] ++;
        // let visibility = this._getDeviceVisibility();
        this._devices[id].active = true;
        this._devices[id].activeProfile = uidevice.get_active_profile();
        let showProfiles = this._settings.get_boolean(Prefs.SHOW_PROFILES);
        for each (let profile in this._devices[id].profiles)           
        {
            let profileItem = this._devices[id].profilesitems[profile.name];
            if(!profileItem)
            {
                let profileName = profile.name;            
                profileItem = this.menu.addAction( "Profile:" + profile.human_name, function() {
                    _this.changeDeviceById(uidevice);        
                    control.change_profile_on_selected_device(uidevice, profileName);
                    global.log("profile changed to " + profileName);
                    _this._setDeviceActiveProfile(_this._devices[id]);
                });


                this._devices[id].profilesitems[profileName] = profileItem;
                profileItem.setProfileActive = function(active){
                    if(active)
                    {
                        this._ornamentLabel.text = "\t\u2727";
                    }
                    else
                    {
                        this._ornamentLabel.text = "\t";
                    }
                };
                profileItem._ornamentLabel.width = 45;
            }

            profileItem.setProfileActive(this._devices[id].activeProfile == profile.name);
        }

        if (!dontcheck  && !this._canShowDevice(uidevice))
        {
            this._deviceRemoved(control, id, true);
        }
        this._setChooserVisibility();
        return uidevice;
    },

    _deviceRemoved: function(control, id, dontcheck) {
        let obj = this._devices[id];
        if(obj) {
            global.log("Removed: " + id);
            if(!dontcheck && this._canShowDevice(obj.uidevice))
            {
                global.log('Device removed, but not hiding as its set to be shown always');
                return;
            }
            let _this = this;
            delete this._availableDevicesIds[id] ;
            this._devices[id].item.actor.visible = false;
            this._devices[id].active = false;
            for each (let profile in this._devices[id].profiles)           
            {
                global.log(profile.name);
                let profileItem = this._devices[id].profilesitems[profile.name];
                if(profileItem)
                {
                    profileItem.actor.visible = false;        
                }
            }

            if(this.timeoutId) {
                Mainloop.source_remove(this.timeoutId);
                this.timeoutId = null;
            }
            /**
             * If the active uidevice is removed, then need to activate the
             * first available uidevice. However for some cases like Headphones,
             * when the uidevice is removed, Speakers are automatically
             * activated. So, lets wait for sometime before activating.
             */
            this.timeoutId = Mainloop.timeout_add(1500, function() {
                if (_this._devices[id] === _this.active_device)
                {
                    for(let x in _this._devices)
                    {
                        if(_this._devices[x].active == true)
                        {
                            _this.changeDeviceById(_this._devices[x].uidevice);
                            break;
                        }
                    }
                }
                _this.timeoutId = null;
                return false;
            });
        }
        this._setChooserVisibility();
    },

    _deviceActivated: function(control, id) {
        global.log("Activated: " + id);
        if(this.active_device) {
            this.active_device.item.setOrnament(PopupMenu.Ornament.NONE);
        }
        if(this._devices[id]) {
            this.active_device = this._devices[id];
            this._devices[id].item.setOrnament(PopupMenu.Ornament.CHECK);
            this.label.text = this._devices[id].text;
            let icon = this._devices[id].uidevice.get_icon_name();
            if(icon == null || icon.trim() == "")
                icon = this.getDefaultIcon();
            this.icon.icon_name = (this._settings.get_boolean(Prefs.USE_MONOCHROME)) ? icon
                    +   "-symbolic" : icon;
        }
    },
    
    _setActiveProfile: function() {
        for each (let device in this._devices)           
        {
            this._setDeviceActiveProfile(device);
        }
        return true;
    },

    _setDeviceActiveProfile: function(device) {
        let activeProfile = device.uidevice.get_active_profile();        
        if(activeProfile && device.activeProfile != activeProfile)
        {
            device.activeProfile = activeProfile;
            global.log("profile changed: " + device.activeProfile);

            for each (let profile in device.profiles)           
            {
                device.profilesitems[profile.name].setProfileActive(profile.name == device.activeProfile);
            }
        }
    },

    _getDeviceVisibility: function() {
        let hideChooser = this._settings.get_boolean(Prefs.HIDE_ON_SINGLE_DEVICE);
        if (hideChooser)
        {
            return (Object.keys(this._availableDevicesIds).length > 1);
        }
        else
        {
            return true;
        }
    },

    _setChooserVisibility: function() {
        let visibility = this._getDeviceVisibility();
        for each (let id in Object.keys(this._availableDevicesIds))           
        {
            this._devices[id].item.actor.visible = visibility;
        }
        this._triangleBin.visible = visibility;
        this._setProfileVisibility();
    },

    _setProfileVisibility: function() {
        let visibility = this._settings.get_boolean(Prefs.SHOW_PROFILES);
        for each (let id in Object.keys(this._availableDevicesIds))        
        {
            let device = this._devices[id];        
            for each (let profile in device.profiles)           
            {
                device.profilesitems[profile.name].actor.visible = 
                    (visibility && device.item.actor.visible && Object.keys(device.profilesitems).length > 1);
            }
        }
    },

    _setIcons: function() {
        let useMonochrome = this._settings.get_boolean(Prefs.USE_MONOCHROME);
        for each (let device in this._devices)           
        {
            let icon = device.uidevice.get_icon_name();
            if(icon == null || icon.trim() == "")
                icon = this.getDefaultIcon();
            device.item._icon.icon_name =  (useMonochrome) ? icon 
                    + "-symbolic" : icon;     
        }
        let icon = this.active_device.uidevice.get_icon_name();
        if(icon == null || icon.trim() == "")
            icon = this.getDefaultIcon();
        
        this.icon.icon_name =  
            (useMonochrome) ? icon + "-symbolic" : icon;
    },
    
    
    _canShowDevice: function(uidevice) {
        if(!uidevice || !this._portsSettings)
        {
            return false;
        }
        
        for each(let port in this._portsSettings)
        {
            if(port && port.name == uidevice.port_name && port.human_name == uidevice.description) {
                switch(port.display_option)
                {
                    case 1:
                        return true;
                        
                    case 2:
                        return false;
                       
                    default:
                        return uidevice.port_available;
                }
            }   
        }
        return uidevice.port_available;
    },
    
    _resetDevices: function() {
        this._portsSettings = JSON.parse(this._settings.get_string(Prefs.PORT_SETTINGS));
        for each (let device in this._devices)           
        {
            switch(this._canShowDevice(device.uidevice))
            {
                case true:
                    this._deviceAdded(this._control, device.uidevice.get_id(), true);
                    break;
                case false:
                    this._deviceRemoved(this._control, device.uidevice.get_id(), true);
                    break;
            }
        }
    },

    destroy: function() {
        this._control.disconnect(this._deviceAddedSignal);
        this._control.disconnect(this._deviceRemovedSignal);
        this._control.disconnect(this._deviceActivatedSignal);
        if(this.timeoutId) {
            Mainloop.source_remove(this.timeoutId);
            this.timeoutId = null;
        }
        if(this.initTimeout) {
            Mainloop.source_remove(this.initTimeout);
            this.initTimeout = null;
        }

        if(this.activeProfileTimeout) {
            Mainloop.source_remove(this.activeProfileTimeout);
            this.activeProfileTimeout = null;
        }

        this.parent();
    }
});

