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
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Base = Me.imports.base;
const Lib = Me.imports.convenience;
const SignalManager = Lib.SignalManager;
const Prefs = Me.imports.prefs;
const Main = imports.ui.main;

const SoundOutputDeviceChooser = new Lang.Class({
    Name : 'SoundOutputDeviceChooser',
    Extends : Base.SoundDeviceChooserBase,
    _init : function() {
        this.parent("output");
    },
    lookupDeviceById : function(id) {
        return this._control.lookup_output_id(id);
    },
    changeDevice : function(uidevice) {
        this._control.change_output(uidevice);
    },
    getDefaultDevice : function() {
        return this._control.get_default_sink();
    },
    getDefaultIcon : function() {
        return "audio-card";
    }
});

const SoundInputDeviceChooser = new Lang.Class({
    Name : 'SoundInputDeviceChooser',
    Extends : Base.SoundDeviceChooserBase,
    _init : function() {
        this.parent("input");
    },
    lookupDeviceById : function(id) {
        return this._control.lookup_input_id(id);
    },
    changeDevice : function(uidevice) {
        this._control.change_input(uidevice);
    },
    getDefaultDevice : function() {
        return this._control.get_default_source();
    },
    getDefaultIcon : function() {
        return "audio-input-microphone";
    }
});

const InputSliderInstance = new Lang.Class({
    Name : 'InputSliderInstance',
    _init : function(volumeMenu) {
        this._input = volumeMenu._input;
        this._settings = Lib.getSettings(Prefs.SETTINGS_SCHEMA);
        this._signalManager = new SignalManager();
        this._signalManager.addSignal(this._settings, "changed::"
                + Prefs.SHOW_INPUT_SLIDER, Lang.bind(this,
                this._setSliderVisiblity));
        this._overrideFunction();
        this._setSliderVisiblity();
    },
    _overrideFunction : function() {
        this._input._shouldBeVisibleOriginal = this._input._shouldBeVisible;
        this._input._shouldBeVisibleCustom = function() {
            return this._stream != null;
        };
    },
    _setSliderVisiblity : function() {
        if (this._settings.get_boolean(Prefs.SHOW_INPUT_SLIDER)) {
            this._input._shouldBeVisible = this._input._shouldBeVisibleCustom;
        } else {
            this._input._shouldBeVisible = this._input._shouldBeVisibleOriginal;
        }
        this._input._maybeShowInput();
    },
    destroy : function() {
        this._signalManager.disconnectAll();
        this._input._shouldBeVisible = this._input._shouldBeVisibleOriginal;
        this._input._maybeShowInput();
        delete this._input['_shouldBeVisibleOriginal'];
        delete this._input['_shouldBeVisibleCustom'];
    }
});

var _outputInstance = null;
var _inputInstance = null;
var _inputSliderInstance = null;

function init(extensionMeta) {
    let theme = imports.gi.Gtk.IconTheme.get_default();
    theme.append_search_path(extensionMeta.path + "/icons");
}

function enable() {
    if (_outputInstance == null) {
        _outputInstance = new SoundOutputDeviceChooser();
    }
    if (_inputInstance == null) {
        _inputInstance = new SoundInputDeviceChooser();
    }
    let _volumeMenu = Main.panel.statusArea.aggregateMenu._volume._volumeMenu;
    if (_inputSliderInstance == null) {
        _inputSliderInstance = new InputSliderInstance(_volumeMenu);
    }
    let menuItems = _volumeMenu._getMenuItems();
    let i = 0;
    for (; i < menuItems.length; i++) {
        if (menuItems[i] === _volumeMenu._output.item) {
            break;
        }
    }
    _volumeMenu.addMenuItem(_outputInstance, ++i);
    menuItems = _volumeMenu._getMenuItems();
    for (i = 0; i < menuItems.length; i++) {
        if (menuItems[i] === _volumeMenu._input.item) {
            break;
        }
    }
    _volumeMenu.addMenuItem(_inputInstance, ++i);
}

function disable() {
    _outputInstance.destroy();
    _outputInstance = null;
    _inputInstance.destroy();
    _inputInstance = null;
    _inputSliderInstance.destroy();
    _inputSliderInstance = null;
}
