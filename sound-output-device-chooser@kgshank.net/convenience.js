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

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const Lang = imports.lang;

/**
 * getSettings:
 * 
 * @schema: (optional): the GSettings schema id
 * 
 * Builds and return a GSettings schema for
 * @schema, using schema files in extensionsdir/schemas. If
 * @schema is not provided, it is taken from metadata['settings-schema'].
 */
function getSettings(schema) {
    let extension = ExtensionUtils.getCurrentExtension();

    schema = schema || extension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    // check if this extension was built with "make zip-file", and thus
    // has the schema files in a sub-folder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell (and therefore schemas are available
    // in the standard folders)
    let schemaDir = extension.dir.get_child('schemas');
    let schemaSource;
    if (schemaDir.query_exists(null))
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),GioSSS.get_default(),false);
    else
        schemaSource = GioSSS.get_default();

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
        throw new Error('Schema ' + schema + ' could not be found for extension '
                + extension.metadata.uuid + '. Please check your installation.');

    return new Gio.Settings({ settings_schema: schemaObj });
}

let cards;
function getProfiles(control, uidevice)
{
    let stream = control.lookup_stream_id(uidevice.get_stream_id());
    if(stream) {
        if(!cards || !cards[stream.card_index]) {
            refreshCards();
        }

        if(cards && cards[stream.card_index]) {
            global.log("Getting profile form stream id " + uidevice.port_name );
        	return getProfilesForPort(uidevice.port_name, cards[stream.card_index]);
        }
    }
    else
    {
        /* Device is not active device, lets try match with port name */
        refreshCards();
        for (let id in cards) {
            let profiles;
            global.log("Getting profile from cards " + uidevice.port_name  + " for card id " + id);
            if((profiles = getProfilesForPort(uidevice.port_name, cards[id])))
            {
                return profiles;
            }
        }
    }

    return null;
}

let ports;
function getPorts(refresh) {
    if(!ports || refresh) {
        refreshCards();
    }
    return ports;
}

function refreshCards() {
    cards = {};
    ports = [];
    let [result, out, err, exit_code] = GLib.spawn_command_line_sync('pactl list cards');
    if(result && !exit_code) {
        parseOutput(out);
    }
    // global.log(JSON.stringify(cards));
}

function parseOutput(out) {
    let lines = out.toString().split('\n');
    let cardIndex;
    let parseSection = "CARDS";
    let port;
    let matches;
    // global.log("Unmatched line:" + out);
    while(lines.length > 0) {
        let line = lines.shift();

        if( (matches = /^Card\s#(\d+)$/.exec(line) )) {
            cardIndex = matches[1];
            if(!cards[cardIndex]) {
                cards[cardIndex] = {'index':cardIndex,'profiles':[], 'ports':[]};
            }
        }
        else if (line.match(/^\t*Profiles:$/) ) {
            parseSection = "PROFILES";
        }
        else if (line.match(/^\t*Ports:$/)) {
            parseSection = "PORTS";
        }
        else if(cards[cardIndex]) {
            switch(parseSection) {
                case "PROFILES":
                    if((matches = /.*?((?:output|input)[^+]*?):\s(.*?)\s\(sinks:/.exec(line))) {
                        cards[cardIndex].profiles.push({'name': matches[1], 'human_name': matches[2]});
                    }
                    break;
                case "PORTS":
                    if((matches = /\t*(.*?):\s(.*?)\s\(priority:/.exec(line))) {
                        port = {'name' : matches[1], 'human_name' : matches[2]};
                        cards[cardIndex].ports.push(port);
                        ports.push({'name' : matches[1], 'human_name' : matches[2]});
                    }
                    else if( port && (matches = /\t*Part of profile\(s\):\s(.*)/.exec(line))) {
                        let profileStr = matches[1];
                        port.profiles = profileStr.split(', ');
                        port = null;
                    }
                    break;
            }
        }
    }
}

const Signal = new Lang.Class({
    Name: 'Signal',

    _init: function(signalSource, signalName, callback) {
        this._signalSource = signalSource;
        this._signalName = signalName;
        this._signalCallback = callback;
    },

    connect: function() {
        this._signalId = this._signalSource.connect(this._signalName, this._signalCallback);
    },

    disconnect: function() {
        if(this._signalId) {
            this._signalSource.disconnect(this._signalId);
            this._signalId = null;
        }
    }
});

const SignalManager = new Lang.Class({
	Name: 'SignalManager',

	_init: function() {
		this._signals = [];
		this._signalsBySource = {};
	},

	addSignal: function(signalSource, signalName, callback) {
		let obj = null;
		if(signalSource && signalName && callback) {
            obj = new Signal(signalSource, signalName, callback);
            obj.connect();
            this._signals.push(obj);
            if(!this._signalsBySource[signalSource]) {
            	this._signalsBySource[signalSource] = [];
            }
            this._signalsBySource[signalSource].push(obj)
        }
		return obj;
    },

    disconnectAll: function() {
    	for (let signal of this._signals){
    		signal.disconnect();
    	}
    },
    
    disconnectBySource: function(signalSource) {
    	if(this._signalsBySource[signalSource]) {
    		for (let signal of this._signalsBySource[signalSource]) {
    			signal.disconnect();
    		}
        }
    }
});


function getProfilesForPort(portName, card) {
    if(card.ports) {
        for (let port of card.ports) {
            if(portName === port.name) {
                let profiles = [];
                for (let profile of port.profiles) {
                    if(profile.indexOf('+input:') == -1) {
                        for (let cardProfile of card.profiles) {
                            if(profile === cardProfile.name) {
                                profiles.push(cardProfile);
                            }
                        }
                    }
                }
                return profiles;
            }
        }
    }
    return null;
}

