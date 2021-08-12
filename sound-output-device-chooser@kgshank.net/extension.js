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

const { GObject } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Base = Me.imports.base;
const Lib = Me.imports.convenience;
const _d = Lib._log;
const SignalManager = Lib.SignalManager;
const Prefs = Me.imports.prefs;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const VolumePatch = Me.imports.volume_patch;

const usePatchMenu = true;

var SoundOutputDeviceChooser = class SoundOutputDeviceChooser
    extends Base.SoundDeviceChooserBase {
    constructor(menuItem) {
        super("output", menuItem);
    }
    lookupDeviceById(control, id) {
        return control.lookup_output_id(id);
    }
    changeDevice(control, uidevice) {
        control.change_output(uidevice);
    }
    getDefaultStream(control) {
        return control.get_default_sink();
    }
    getDefaultIcon() {
        return "audio-card";
    }
};

var SoundInputDeviceChooser = class SoundInputDeviceChooser
    extends Base.SoundDeviceChooserBase {
    constructor(menuItem) {
        super("input", menuItem);
    }
    lookupDeviceById(control, id) {
        return control.lookup_input_id(id);
    }
    changeDevice(control, uidevice) {
        control.change_input(uidevice);
    }
    getDefaultStream(control) {
        return control.get_default_source();
    }
    getDefaultIcon() {
        return "audio-input-microphone";
    }
};

var VolumeMenuInstance = class VolumeMenuInstance {
    constructor(volume, settings) {
        this._settings = settings;
        this._volume = volume;

        this._volumeMenu = this._volume._volumeMenu;
        this._input = this._volumeMenu._input;
        this._output = this._volumeMenu._output;

        // Add the patch
        this._volume._volumeMenu_patch = new VolumePatch.VolumeMenu(this._volume._control);
        this._volumeMenu_patch = this._volume._volumeMenu_patch;
        this._input_patch = this._volumeMenu_patch._input;
        this._output_patch = this._volumeMenu_patch._output;
        this._volume.menu.addMenuItem(this._volume._volumeMenu_patch);

        this._overrideFunctions();
        this._setSliderVisibility();

        this._signalManager = new SignalManager();
        this._signalManager.addSignal(this._settings, "changed::"
            + Prefs.SHOW_INPUT_SLIDER, this._setSliderVisibility.bind(this));
    }
    _overrideFunctions() {
        // Fix the indicator when using SHOW_INPUT_SLIDER. 
        // If not applied when SHOW_INPUT_SLIDER=True indication of mic being used will be on (even when not used)
        this._volumeMenu._getInputVisibleOriginal = this._volumeMenu.getInputVisible;
        this._volumeMenu._getInputVisibleCustom = function() {
            return this._input._stream != null && this._input._showInput;
        };
        this._volumeMenu.getInputVisible = this._volumeMenu._getInputVisibleCustom;
        
        this._input._updateVisibilityOriginal = this._input._updateVisibility;
        this._input._updateVisibilityCustom = function() {
            let old_state_visible = this.item.visible;
            let visible = this._shouldBeVisible();

            if(old_state_visible != visible){
                this.item.visible = visible;
            } else {
                this.item.notify('visible');
            }
        };
        this._input._updateVisibility = this._input._updateVisibilityCustom;

        // Makes slider visible when SHOW_INPUT_SLIDER=True (also add forceInvisible trick)
        this._input._forceInvisible = false;
        this._input._showInputSlider = this._settings.get_boolean(Prefs.SHOW_INPUT_SLIDER);
        this._input._shouldBeVisibleOriginal = this._input._shouldBeVisible;
        this._input._shouldBeVisibleCustom = function() {
            return !this._forceInvisible &&
             (this._showInputSlider && (this._stream != null) || this._shouldBeVisibleOriginal());
        };
        this._input._shouldBeVisible = this._input._shouldBeVisibleCustom;

        // Add forceInvisible trick to output
        this._output._forceInvisible = false;
        this._output._shouldBeVisibleOriginal = this._output._shouldBeVisible;
        this._output._shouldBeVisibleCustom = function() {
            return !this._forceInvisible && this._shouldBeVisibleOriginal();
        };
        this._output._shouldBeVisible = this._output._shouldBeVisibleCustom;
    }
    _setSliderVisibility() {
        let show_input_slider = this._settings.get_boolean(Prefs.SHOW_INPUT_SLIDER);

        this._input._showInputSlider = show_input_slider;
        this._input._maybeShowInput();

        this._input_patch._showInputSlider = show_input_slider;
        this._input_patch._maybeShowInput();
    }
    replaceOutputMenuWithPatch(value) {
        this._output._forceInvisible = value;
        this._output._updateVisibility();

        this._output_patch._forceInvisible = !value;
        this._output_patch._updateVisibility();
    }
    replaceInputMenuWithPatch(value) {
        this._input._forceInvisible = value;
        this._input._maybeShowInput();

        this._input_patch._forceInvisible = !value;
        this._input_patch._maybeShowInput();
    }
    movePatchOnTop() {
        this._volume.menu.moveMenuItem(this._volume._volumeMenu_patch, 0);
    }
    movePatchBelow() {
        this._volume.menu.moveMenuItem(this._volume._volumeMenu_patch, 1);
    }
    destroy() {
        this._signalManager.disconnectAll();

        this._volumeMenu.getInputVisible = this._volumeMenu._getInputVisibleOriginal;
        this._input._updateVisibility = this._input._updateVisibilityOriginal;
        this._input._shouldBeVisible = this._input._shouldBeVisibleOriginal;
        this._output._shouldBeVisible = this._output._shouldBeVisibleOriginal;

        this._input._maybeShowInput();

        this._volume._volumeMenu_patch.destroy();
        delete this._volume['_volumeMenu_patch'];

        delete this._volumeMenu['_getInputVisibleOriginal'];
        delete this._volumeMenu['_getInputVisibleCustom'];
        delete this._input['_updateVisibilityOriginal'];
        delete this._input['_updateVisibilityCustom'];
        delete this._input['_shouldBeVisibleOriginal'];
        delete this._input['_shouldBeVisibleCustom'];
        delete this._input['_showInputSlider'];               // variable
        delete this._input['_forceInvisible'];                // variable
        delete this._output['_shouldBeVisibleOriginal'];
        delete this._output['_shouldBeVisibleCustom'];
        delete this._output['_forceInvisible'];               // variable
    }
}

var SDCInstance = class SDCInstance {
    constructor() {
        this._settings = ExtensionUtils.getSettings();
        this._aggregateMenu = Main.panel.statusArea.aggregateMenu;
        this._volume = this._aggregateMenu._volume;
        this._volumeMenu = this._volume._volumeMenu;
        this._aggregateLayout = this._aggregateMenu.menu.box.get_layout_manager();
        }
  
    enable() {
        ExtensionUtils.initTranslations();
        let theme = imports.gi.Gtk.IconTheme.get_default();
        if (theme != null) {
            let iconPath = Me.dir.get_child('icons');
            if (iconPath != null && iconPath.query_exists(null)) {
                theme.append_search_path(iconPath.get_path());
            }
        }

        // These are the external submenu menus, not the ones integrated with sliders
        if(this._externalSubmenuMenu_output == null)
        {
            this._externalSubmenuMenu_output = new PopupMenu.PopupSubMenuMenuItem(_("Extension initialising..."), true);
            this._externalSubmenuMenu_output.sliderIntegraded = false;
            this._externalSubmenuMenu_output.visible = !usePatchMenu;
            this._addExternalMenuItem(this._volumeMenu, this._volumeMenu._output.item, this._externalSubmenuMenu_output);
        }
        if(this._externalSubmenuMenu_input == null)
        {
            this._externalSubmenuMenu_input = new PopupMenu.PopupSubMenuMenuItem(_("Extension initialising..."), true);
            this._externalSubmenuMenu_input.sliderIntegraded = false;
            this._externalSubmenuMenu_input.visible = !usePatchMenu;
            this._addExternalMenuItem(this._volumeMenu, this._volumeMenu._input.item, this._externalSubmenuMenu_input);
        }

        if (this._volumeMenuInstance == null) {
            this._volumeMenuInstance = new VolumeMenuInstance(this._volume, this._settings);
            this._volumeMenu_patch = this._volumeMenuInstance._volumeMenu_patch;
        }

        if (this._outputInstance == null) {
            this._outputInstance = new SoundOutputDeviceChooser(usePatchMenu ? this._volumeMenu_patch._output.item : this._externalSubmenuMenu_output);
            this._outputUpdateSignalID = this._outputInstance.emitter.connect('update-visibility', this._updateVisibitity.bind(this));
        }
        if (this._inputInstance == null) {
            this._inputInstance = new SoundInputDeviceChooser(usePatchMenu ? this._volumeMenu_patch._input.item : this._externalSubmenuMenu_input);
            this._inputUpdateSignalID = this._inputInstance.emitter.connect('update-visibility', this._updateVisibitity.bind(this));
        }

        this._expSignalId = this._settings.connect("changed::" + Prefs.EXPAND_VOL_MENU, this._expandVolMenu.bind(this));

        this._expandVolMenu();
        this._updateVisibitity();
    }

    _addExternalMenuItem(_volumeMenu, checkItem, menuItem) {
        let menuItems = _volumeMenu._getMenuItems();
        let i = menuItems.findIndex(elem => elem === checkItem);
        if (i < 0) {
            i = menuItems.length;
        }
        _volumeMenu.addMenuItem(menuItem, ++i);
    }

    _expandVolMenu() {
        if (this._settings.get_boolean(Prefs.EXPAND_VOL_MENU)) {
            this._aggregateLayout.addSizeChild(this._volumeMenu.actor);
            this._aggregateLayout.addSizeChild(this._volumeMenu_patch.actor);
        } else {
            this._revertVolMenuChanges();
        }
    }

    _revertVolMenuChanges() {
        this._aggregateLayout._sizeChildren = this._aggregateLayout._sizeChildren.filter(item => item !== this._volumeMenu.actor && item !== this._volumeMenu_patch.actor);
        this._aggregateLayout.layout_changed();
    }

    _updateVisibitity()
    {
        if(!usePatchMenu) {
            this._volumeMenuInstance.replaceOutputMenuWithPatch(false);
            this._volumeMenuInstance.replaceInputMenuWithPatch(false);

            let output_selection_visible = this._outputInstance.shouldBeVisible();
            this._externalSubmenuMenu_output.visible = output_selection_visible;
            let input_selection_visible = this._inputInstance.shouldBeVisible();
            this._externalSubmenuMenu_input.visible = input_selection_visible;
        } else {
            let output_selection_visible = this._outputInstance.shouldBeVisible();
            this._volumeMenuInstance.replaceOutputMenuWithPatch(output_selection_visible);
            this._externalSubmenuMenu_output.visible = false;

            let input_selection_visible = this._inputInstance.shouldBeVisible();
            this._volumeMenuInstance.replaceInputMenuWithPatch(input_selection_visible);
            this._externalSubmenuMenu_input.visible = false;

            // We want 1st the speaker and then the microphone
            // Without this trick when input_selection_visible = false mic is over the speaker
            if(!output_selection_visible && input_selection_visible)
            {
                this._volumeMenuInstance.movePatchBelow();
            } else if(output_selection_visible && !input_selection_visible){
                this._volumeMenuInstance.movePatchOnTop();
            }
        }
    }

    disable() {
        this._revertVolMenuChanges();
        if (this._expSignalId) {
            this._settings.disconnect(this._expSignalId);
            this._expSignalId = null;
        }

        if (this._outputInstance) {
            this._outputInstance.disconnect(this._outputUpdateSignalID);
            this._outputInstance.destroy();
            this._outputInstance = null;
        }
        if (this._inputInstance) {
            this._inputInstance.disconnect(this._inputUpdateSignalID);
            this._inputInstance.destroy();
            this._inputInstance = null;
        }

        if (this._externalSubmenuMenu_output == null) {
            this._externalSubmenuMenu_output.destroy();
            this._externalSubmenuMenu_output = null;
        }
        if (this._externalSubmenuMenu_input == null) {
            this._externalSubmenuMenu_input.destroy();
            this._externalSubmenuMenu_input = null;
        }

        if (this._volumeMenuInstance) {
            this._volumeMenuInstance.destroy();
            this._volumeMenuInstance = null;
        }
    }
};

function init() {
    ExtensionUtils.initTranslations(Me.metadata["gettext-domain"]);
    return new SDCInstance();
}
