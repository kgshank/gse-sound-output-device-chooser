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

const {GObject} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Base = Me.imports.base;
const Lib = Me.imports.convenience;
const SignalManager = Lib.SignalManager;
const Prefs = Me.imports.prefs;
const Main = imports.ui.main;

var SoundOutputDeviceChooser =  class SoundOutputDeviceChooser 
extends Base.SoundDeviceChooserBase {
    constructor() {
        super("output");
    }
    lookupDeviceById(id) {
        return this._control.lookup_output_id(id);
    }
    changeDevice(uidevice) {
        this._control.change_output(uidevice);
    }
    getDefaultDevice() {
        return this._control.get_default_sink();
    }
    getDefaultIcon() {
        return "audio-card";
    }
};

var SoundInputDeviceChooser =  class SoundInputDeviceChooser 
extends Base.SoundDeviceChooserBase {
    constructor() {
        super("input");
    }
    lookupDeviceById(id) {
        return this._control.lookup_input_id(id);
    }
    changeDevice(uidevice) {
        this._control.change_input(uidevice);
    }
    getDefaultDevice() {
        return this._control.get_default_source();
    }
    getDefaultIcon() {
        return "audio-input-microphone";
    }
};

var InputSliderInstance = class InputSliderInstance {
    constructor(volumeMenu, settings ) {
        this._input = volumeMenu._input;
        this._settings = settings;
        this._signalManager = new SignalManager();
        this._signalManager.addSignal(this._settings, "changed::"
                + Prefs.SHOW_INPUT_SLIDER, this._setSliderVisiblity.bind(this));
        this._overrideFunction();
        this._setSliderVisiblity();
    }
    _overrideFunction() {
        this._input._shouldBeVisibleOriginal = this._input._shouldBeVisible;
        this._input._shouldBeVisibleCustom = function() {
            return this._stream != null;
        };
    }
    _setSliderVisiblity() {
        if (this._settings.get_boolean(Prefs.SHOW_INPUT_SLIDER)) {
            this._input._shouldBeVisible = this._input._shouldBeVisibleCustom;
        } else {
            this._input._shouldBeVisible = this._input._shouldBeVisibleOriginal;
        }
        this._input._maybeShowInput();
    }
    destroy() {
        this._signalManager.disconnectAll();
        this._input._shouldBeVisible = this._input._shouldBeVisibleOriginal;
        this._input._maybeShowInput();
        delete this._input['_shouldBeVisibleOriginal'];
        delete this._input['_shouldBeVisibleCustom'];
    }
};

var SDCInstance = class SDCInstance {
    constructor(){
        this._settings = Lib.getSettings(Prefs.SETTINGS_SCHEMA);
        this._aggregateMenu = Main.panel.statusArea.aggregateMenu;
        this._volumeMenu = this._aggregateMenu._volume._volumeMenu;
        this._aggregateLayout = this._aggregateMenu.menu.box.get_layout_manager();
    }

    enable(){
        let theme = imports.gi.Gtk.IconTheme.get_default();
        if(theme != null) {
            let iconPath = Me.dir.get_child('icons');
            if (iconPath != null && iconPath.query_exists(null)){
            	theme.append_search_path(iconPath.get_path());
            }
        }
    
        if (this._outputInstance == null) {
            this._outputInstance = new SoundOutputDeviceChooser();
        }
        if (this._inputInstance == null) {
            this._inputInstance = new SoundInputDeviceChooser();
        }

        if (this._inputSliderInstance == null) {
            this._inputSliderInstance = new InputSliderInstance(this._volumeMenu, this._settings);
        }

        this._addMenuItem(this._volumeMenu, this._volumeMenu._output.item, this._outputInstance.menuItem);
        this._addMenuItem(this._volumeMenu, this._volumeMenu._input.item, this._inputInstance.menuItem);

        this._expSignalId = this._settings.connect("changed::" + Prefs.EXPAND_VOL_MENU, this._expandVolMenu.bind(this));
        
        this._expandVolMenu();
    }

    _addMenuItem(_volumeMenu, checkItem, menuItem){
        let menuItems = _volumeMenu._getMenuItems();
        let i = 0;
        for (; i < menuItems.length; i++) {
            if (menuItems[i] === checkItem) {
                break;
            }
        }
        _volumeMenu.addMenuItem(menuItem, ++i);
    }

    _expandVolMenu() {
        if (this._settings.get_boolean(Prefs.EXPAND_VOL_MENU)) {
            this._aggregateLayout.addSizeChild(this._volumeMenu.actor);
        } else {
            this._revertVolMenuChanges();
        }
    }

    _revertVolMenuChanges() {
        this._aggregateLayout._sizeChildren = this._aggregateLayout._sizeChildren.filter(item => item !== this._volumeMenu.actor);
        this._aggregateLayout.layout_changed();
    }

    disable(){
        this._revertVolMenuChanges();
        this._outputInstance.destroy();
        this._outputInstance = null;
        this._inputInstance.destroy();
        this._inputInstance = null;
        this._inputSliderInstance.destroy();
        this._inputSliderInstance = null;
        if(this._expSignalId) {
            this._settings.disconnect(this._expSignalId);
            this._expSignalId = null;
        }
    }
};

function init() {
    return new SDCInstance();
}
