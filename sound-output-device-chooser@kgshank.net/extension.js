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
const
Lang = imports.lang;
const
ExtensionUtils = imports.misc.extensionUtils;
const
Me = ExtensionUtils.getCurrentExtension();
const
Base = Me.imports.base;

const
SoundOutputDeviceChooser = new Lang.Class({
    Name : 'SoundOutputDeviceChooser',
    Extends : Base.SoundDeviceChooserBase,

    _init : function() {
        this.parent("output")
    },

    lookupDeviceById : function(id) {
        return this._control.lookup_output_id(id);
    },

    changeDeviceById : function(id) {
        this._control.change_output(id);
    },

    getDefaultDevice : function() {
        return this._control.get_default_sink();
    },

    getDefaultIcon : function() {
        return "audio-card";
    }

});

const
SoundInputDeviceChooser = new Lang.Class({
    Name : 'SoundInputDeviceChooser',
    Extends : Base.SoundDeviceChooserBase,

    _init : function() {
        this.parent("input")
    },

    lookupDeviceById : function(id) {
        return this._control.lookup_input_id(id);
    },

    changeDeviceById : function(id) {
        this._control.change_input(id);
    },

    getDefaultDevice : function() {
        return this._control.get_default_source();
    },

    getDefaultIcon : function() {
        return "audio-input-microphone";
    }

});

let
_outputInstance = null;
let
_inputInstance = null;

function init() {
}

function enable() {
    if (_outputInstance == null) {
        _outputInstance = new SoundOutputDeviceChooser();
    }
    if (_inputInstance == null) {
        _inputInstance = new SoundInputDeviceChooser();
    }
}

function disable() {
    _outputInstance.destroy();
    _outputInstance = null;
    _inputInstance.destroy();
    _inputInstance = null;
}
