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
const _dump = Lib.dump;
const getActor = Lib.getActor;
const SignalManager = Lib.SignalManager;
const Prefs = Me.imports.prefs;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

var SoundOutputDeviceChooser = class SoundOutputDeviceChooser
    extends Base.SoundDeviceChooserBase {
    constructor() {
        super("output");
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
    constructor() {
        super("input");
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
    constructor(volumeMenu, settings) {
        this._settings = settings;

        this._volumeMenu = volumeMenu;
        this._input = this._volumeMenu._input;

        this._overrideFunctions();
        this._setSliderVisiblity();

        this._signalManager = new SignalManager();
        this._signalManager.addSignal(this._settings, "changed::"
            + Prefs.SHOW_INPUT_SLIDER, this._setSliderVisiblity.bind(this));
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
            let old_state_visible = getActor(this.item).visible;
            let visible = this._shouldBeVisible();

            if (old_state_visible != visible) {
                getActor(this.item).visible = visible;
            } else {
                getActor(this.item).notify('visible');
            }
        };
        this._input._updateVisibility = this._input._updateVisibilityCustom;

        // Makes slider visible when SHOW_INPUT_SLIDER=True
        this._input._showInputSlider = this._settings.get_boolean(Prefs.SHOW_INPUT_SLIDER);
        this._input._shouldBeVisibleOriginal = this._input._shouldBeVisible;
        this._input._shouldBeVisibleCustom = function() {
            return this._showInputSlider && (this._stream != null) || this._shouldBeVisibleOriginal();
        };
        this._input._shouldBeVisible = this._input._shouldBeVisibleCustom;
    }
    _setSliderVisiblity() {
        this._input._showInputSlider = this._settings.get_boolean(Prefs.SHOW_INPUT_SLIDER);
        this._input._maybeShowInput();
    }
    destroy() {
        this._signalManager.disconnectAll();
        delete this._signalManager;
        this._volumeMenu.getInputVisible = this._volumeMenu._getInputVisibleOriginal;
        this._input._updateVisibility = this._input._updateVisibilityOriginal;
        this._input._shouldBeVisible = this._input._shouldBeVisibleOriginal;

        this._input._maybeShowInput();

        delete this._volumeMenu['_getInputVisibleOriginal'];
        delete this._volumeMenu['_getInputVisibleCustom'];
        delete this._input['_updateVisibilityOriginal'];
        delete this._input['_updateVisibilityCustom'];
        delete this._input['_shouldBeVisibleOriginal'];
        delete this._input['_shouldBeVisibleCustom'];
        delete this._input['_showInputSlider'];               // variable
    }
}

var SDCInstance = class SDCInstance {
    constructor() {
    }

    enable() {
        this._settings = ExtensionUtils.getSettings();
        this._signalManager = new SignalManager();
        this._aggregateMenu = Main.panel.statusArea.aggregateMenu;
        this._volume = this._aggregateMenu._volume;
        this._volumeMenu = this._volume._volumeMenu;
        this._aggregateLayout = this._aggregateMenu.menu.box.get_layout_manager();
        let theme = imports.gi.Gtk.IconTheme.get_default();
        if (theme != null) {
            let iconPath = Me.dir.get_child('icons');
            if (iconPath != null && iconPath.query_exists(null)) {
                theme.append_search_path(iconPath.get_path());
            }
        }

        if (this._outputInstance == null) {
            this._outputInstance = new SoundOutputDeviceChooser();
        }
        if (this._inputInstance == null) {
            this._inputInstance = new SoundInputDeviceChooser();
        }

        if (this._volumeMenuInstance == null) {
            this._volumeMenuInstance = new VolumeMenuInstance(this._volumeMenu, this._settings);
        }

        this._addMenuItem(this._volumeMenu, this._volumeMenu._output.item, this._outputInstance.menuItem);
        this._addMenuItem(this._volumeMenu, this._volumeMenu._input.item, this._inputInstance.menuItem);
        this._expandVolMenu();

        this._signalManager.addSignal(this._settings, "changed::" + Prefs.EXPAND_VOL_MENU, this._expandVolMenu.bind(this));
        this._signalManager.addSignal(this._settings, "changed::" + Prefs.INTEGRATE_WITH_SLIDER, this._switchSubmenuMenu.bind(this));
        this._signalManager.addSignal(this._outputInstance, "update-visibility", this._updateMenuVisibility.bind(this));
        this._signalManager.addSignal(this._inputInstance, "update-visibility", this._updateMenuVisibility.bind(this));

        //If slider disappears remove menu integration, getting complicated!!
        this._signalManager.addSignal(getActor(this._volumeMenu._output.item),
            "notify::visible", () => { this._updateMenuVisibility(this._outputInstance, false) });
        this._signalManager.addSignal(getActor(this._volumeMenu._input.item),
            "notify::visible", () => { this._updateMenuVisibility(this._inputInstance, false) });
    }

    _addMenuItem(_volumeMenu, checkItem, menuItem) {
        let menuItems = _volumeMenu._getMenuItems();
        let i = menuItems.findIndex(elem => elem === checkItem);
        if (i < 0) {
            i = menuItems.length;
        }
        _volumeMenu.addMenuItem(menuItem, ++i);
        this._integrateMenu(_volumeMenu, getActor(checkItem), getActor(menuItem));
    }

    _expandVolMenu() {
        if (this._settings.get_boolean(Prefs.EXPAND_VOL_MENU)) {
            this._aggregateLayout.addSizeChild(getActor(this._volumeMenu));
        } else {
            this._revertVolMenuChanges();
        }
    }

    _revertVolMenuChanges() {
        this._aggregateLayout._sizeChildren = this._aggregateLayout._sizeChildren.filter(item => item !== getActor(this._volumeMenu));
        this._aggregateLayout.layout_changed();
    }

    _updateMenuVisibility(menuInstance, visible) {
        if (menuInstance instanceof SoundOutputDeviceChooser) {
            this._integrateMenu(this._volumeMenu, getActor(this._volumeMenu._output.item), getActor(menuInstance.menuItem), visible);
        } else {
            this._integrateMenu(this._volumeMenu, getActor(this._volumeMenu._input.item), getActor(menuInstance.menuItem), visible);
        }
    }

    _switchSubmenuMenu() {
        _d("Output Device visibility");
        this._updateMenuVisibility(this._outputInstance, getActor(this._outputInstance.menuItem).visible);
        _d("Input Device visibility");
        this._updateMenuVisibility(this._inputInstance, getActor(this._inputInstance.menuItem).visible);
    }

    _integrateMenu(_volumeMenu, sliderItem, selectorItem, visible) {
        let canIntegrate = sliderItem.visible && (visible || selectorItem.visible) && this._settings.get_boolean(Prefs.INTEGRATE_WITH_SLIDER);
        if (canIntegrate == true) {
            _d("Integrating with Volume menu ");
            if (_volumeMenu.box.contains(sliderItem) == true) {
                _volumeMenu.box.remove_child(sliderItem);
            }
            sliderItem.set_x_expand(true);
            sliderItem.set_style('padding-right: 0px;');
            if(sliderItem._ornamentLabel)
            {
            	sliderItem._ornamentLabel.hide();
            }
            sliderItem.set_track_hover(false);
            selectorItem.insert_child_above(sliderItem, selectorItem.label);
            selectorItem.label.hide();
            sliderItem.get_next_sibling().hide(); //expander
            selectorItem.icon.hide();
            selectorItem.set_style('padding-left: 0px;padding-top: 0px; padding-bottom: 0px');
        } else {
            _d("Not integrating with Volume menu")
            if (selectorItem.contains(sliderItem) == true) {
                selectorItem.remove_child(sliderItem);
            }
            sliderItem.set_x_expand(false);
            sliderItem.set_style('');
            if(sliderItem._ornamentLabel)
            {
				sliderItem._ornamentLabel.show();
			}
            sliderItem.set_track_hover(true);
            selectorItem.label.show();
            selectorItem.label.get_next_sibling().show(); //expander
            selectorItem.icon.show();
            selectorItem.set_style('');
            if (_volumeMenu.box.contains(sliderItem) == false) {
                let oriVisible = sliderItem.visible;
                _volumeMenu.box.insert_child_below(sliderItem, selectorItem);
                sliderItem.visible = oriVisible;
            }
        }
    }

    disable() {
        //this._switchSubmenuMenu();
        this._revertVolMenuChanges();
        if (this._outputInstance) {
            this._outputInstance.setVisible(false);
            this._outputInstance.destroy();
            this._outputInstance = null;
        }
        if (this._inputInstance) {
            this._inputInstance.setVisible(false);
            this._inputInstance.destroy();
            this._inputInstance = null;
        }
        if (this._volumeMenuInstance) {
            this._volumeMenuInstance.destroy();
            this._volumeMenuInstance = null;
        }
        this._settings = null;
        this._signalManager.disconnectAll();
        this._signalManager = null;
    }
};

function init() {
    ExtensionUtils.initTranslations(Me.metadata["gettext-domain"]);
    return new SDCInstance();
}
