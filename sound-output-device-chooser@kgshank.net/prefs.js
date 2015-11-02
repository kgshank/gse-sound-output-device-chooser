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

const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Lib = Me.imports.convenience;
const SETTINGS_SCHEMA = "org.gnome.shell.extensions.sound-output-device-chooser";
const HIDE_ON_SINGLE_DEVICE = "hide-on-single-device";
const SHOW_PROFILES = "show-profiles";

function init(){}


const SDCSettingsWidget = new GObject.Class({
    Name: 'SDC.Prefs.Widget',
    GTypeName: 'SDCSettingsWidget',
    Extends: Gtk.Box,

    _init: function(params) {
        this.parent(params);
    
        this.orientation = Gtk.Orientation.VERTICAL;
        this.spacign = 0;

        // creates the settings
        this.settings = Lib.getSettings(SETTINGS_SCHEMA);

        // creates the ui builder and add the main resource file
        let uiFilePath = Me.path + "/ui/prefs-dialog.gtkbuilder";
        let builder = new Gtk.Builder();

        if (builder.add_from_file(uiFilePath) == 0) {
            global.log("JS LOG: could not load the ui file: %s".format(uiFilePath));

            let label = new Gtk.Label({
                label: _("Could not load the preferences UI file"),
                vexpand: true
            });

            this.pack_start(label, true, true, 0);
        } else {
            global.log('JS LOG:_UI file receive and load: '+uiFilePath);
        
            let mainContainer = builder.get_object("main-gtkbox1");
            
            this.pack_start(mainContainer, true, true, 0);

            let showProfileSwitch = builder.get_object("show-profile");
            let singleDeviceSwitch = builder.get_object("single-device");
            
            this.settings.bind(HIDE_ON_SINGLE_DEVICE, singleDeviceSwitch , "active", Gio.SettingsBindFlags.DEFAULT);
            this.settings.bind(SHOW_PROFILES,showProfileSwitch , "active", Gio.SettingsBindFlags.DEFAULT);
           

        }
    }
});


function buildPrefsWidget() {
    let widget = new SDCSettingsWidget();
    widget.show_all();

    return widget;
}
