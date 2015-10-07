/******************************************************************************
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

Orignal Author: Gopi Sankar Karmegam
******************************************************************************/
const Lang = imports.lang;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Mainloop = imports.mainloop;
const Gvc = imports.gi.Gvc;

const SoundOutputDeviceChooser = new Lang.Class({
    Name: 'SoundOutputDeviceChooser',
    Extends: PopupMenu.PopupSubMenuMenuItem,

    _init: function() {
        this.parent('Active Device', true);
        this._control = Main.panel.statusArea.aggregateMenu._volume._control;
        this._devices = {};
        let _this = this;
        this._outputAddedSignal = this._control.connect("output-added", function(control,id){_this._outputAdded(control, id)});
        this._outputRemovedSignal = this._control.connect("output-removed", function(control,id){_this._outputRemoved(control, id)});
        this._outputActivatedSignal = this._control.connect("active-output-update", function(control,id){_this._outputActivated(control, id)});
	
	/**
	 * Wait for other devices and shell volume extension, if available to be
	 * initialised
	 */
        this.initTimeout = Mainloop.timeout_add(1500, Lang.bind(this,
                            this._lateInit));
    },

    _lateInit: function() {
         /*
			 * There is no direct way to get all the UI devices from
			 * mixercontrol. When enabled after shell loads, the signals will
			 * not be emitted, a simple hack to look for ids, until any device
			 * is not found. The UI devices are always serialed from from 1 to n
			 */
        this.initTimeout = null;
        let defaultSink = this._control.get_default_sink();
        let id = 0;
        let dummyDevice = new Gvc.MixerUIDevice();

        global.log("Max Id:" + dummyDevice.get_id());
        while(++id <= dummyDevice.get_id())
        {
            let device = this._outputAdded(this._control, id);
            if(device && device.port_available)
            {
                let stream = this._control.get_stream_from_device(device);
                if(stream == defaultSink && stream.get_port().port === device.get_port()) {
                    this._outputActivated(this._control, id);
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


    _outputAdded: function(control, id) {
        if(!this._devices[id]) {
            let device = control.lookup_output_id(id);
            if(!device || !device.port_available) {
                return device;
            }
	    this._devices[id] = new Object();
            this._devices[id].device = device;
            this._devices[id].text = device.description + "\n(" + device.origin + ")";
            this._devices[id].item = this.menu.addAction( this._devices[id].text, function() {
                control.change_output(device);
            });
            this._devices[id].item._icon = new St.Icon({ style_class: 'popup-menu-icon',
                icon_name: device.get_icon_name()});
            this._devices[id].item.actor.insert_child_at_index(this._devices[id].item._icon,1);
        }
        global.log("Added: " + id);
        this._devices[id].item.actor.visible = true;
        this._devices[id].active = true;
	
        return this._devices[id].device;
    },

    _outputRemoved: function(control, id) {
        if(this._devices[id]) {
            global.log("Removed: " + id);
            this._devices[id].item.actor.visible = false;
            this._devices[id].active = false;
            let _this = this;
            if(this.timeoutId) {
                Mainloop.source_remove(this.timeoutId);
                this.timeoutId = null;
            }
            /**
			 * If the active device is removed, then need to activate the first
			 * available device. However for some cases like Headphones, when
			 * the device is removed, Speakers are automatically activated. So,
			 * lets wait for sometime before activating.
			 */
            this.timeoutId = Mainloop.timeout_add(1500, function() {
                if (_this._devices[id] === _this.active_device)
                {
                    for(let x in _this._devices)
                    {
                        if(_this._devices[x].active == true)
                        {
                            control.change_output(_this._devices[x].device);
                            break;
                        }
                    }
                }
                _this.timeoutId = null;
                return false;
            });
        }
    },

    _outputActivated: function(control, id) {
        global.log("Activated: " + id);
        if(this.active_device) {
            this.active_device.item.setOrnament(PopupMenu.Ornament.NONE);
        }
        if(this._devices[id]) {
            this.active_device = this._devices[id];
            this._devices[id].item.setOrnament(PopupMenu.Ornament.CHECK);
            this.label.text = this._devices[id].text;
            this.icon.icon_name = this._devices[id].device.get_icon_name();
        }
    },

    destroy: function() {
        this._control.disconnect(this._outputAddedSignal);
        this._control.disconnect(this._outputRemovedSignal);
        this._control.disconnect(this._outputActivatedSignal);
        if(this.timeoutId) {
            Mainloop.source_remove(this.timeoutId);
            this.timeoutId = null;
        }
        if(this.initTimeout) {
            Mainloop.source_remove(this.initTimeout);
            this.initTimeout = null;
        }
        this.parent();
        
    }
});

let _instance = null;

function init() {
}

function enable() {
    if (_instance == null) {
        _instance = new SoundOutputDeviceChooser();
    }	
}

function disable() {
    _instance.destroy();
    _instance = null;
}
