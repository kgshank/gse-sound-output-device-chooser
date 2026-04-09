#include <stdio.h>
#include <stdlib.h>
#include <iostream>

#include <pulse/pulseaudio.h>

#include <pulse/introspect.h>
#include <pulse/mainloop.h>
#include <pulse/context.h>

#include <nlohmann/json.hpp>
// for convenience
using json = nlohmann::json;

#define CLIENT_NAME "PAHelper"

static pa_context *context = NULL;
static pa_mainloop *mainloop = NULL;
static pa_operation *operation = NULL;
static pa_mainloop_api *mainloop_api = NULL;

pa_context_notify_cb_t _pa_context_notify_cb_t = NULL;
pa_card_info_cb_t _pa_card_info_cb_t = NULL;

bool _opn_completed = 0;
pa_context_state_t _pa_state = PA_CONTEXT_UNCONNECTED;

void pa_context_notify_cb(pa_context *ctx, void *userdata) {
	_pa_state = pa_context_get_state(ctx);
}

json _cards = json::object();
json _ports = json::array();

void pa_card_info_cb(pa_context *ctx, const pa_card_info* card_info, int eol, void *userdata) {
	if (card_info == NULL) return;

	pa_card_info card = card_info[0];

	std::string _idx_str = std::to_string(card.index);

	json card_obj = {
		{"index", _idx_str},
		{"name", card.name},
		{"alsa_name", (char*)pa_proplist_gets(card.proplist,"alsa.card_name")},
		{"card_description", (char*)pa_proplist_gets(card.proplist,"device.description")},
		{"profiles", json::array()}, // Empty array, will be filled below
		{"ports", json::array()}, // Empty array, will be filled below
	};

	for (uint32_t i=0; i<card.n_profiles; i++) {
		pa_card_profile_info2* profile = card.profiles2[i];
		if (profile == NULL) break;
		json profile_obj = {
			{"name", profile->name},
			{"human_name", profile->description},
			{"available", profile->available},
		};

		card_obj["profiles"].push_back(profile_obj);
	}

        for (uint32_t i=0; i<card.n_ports; i++) {
		pa_card_port_info* port = card.ports[i];
		if (port == NULL) break;

		json port_obj = {
			{"name", port->name},
			{"human_name", port->description},
			{"direction", (port->direction & PA_DIRECTION_OUTPUT) ? "Output" : "Input"},
			{"available", port->available},
			{"card_name", card_obj["name"]},
			{"card_description", card_obj["card_description"]},

			{"n_profiles", port->n_profiles},
			{"profiles", json::array()}, // Empty array, will be filled below
		};

		for (uint32_t j=0; j<port->n_profiles; j++) {
			pa_card_profile_info2* profile = port->profiles2[j];
			if (profile == NULL) break;
			if (profile->name != NULL)
				port_obj["profiles"].push_back(profile->name);
		}

		_ports.push_back(port_obj);
		card_obj["ports"].push_back(port_obj);
	}

	_cards[_idx_str] = card_obj;
	_opn_completed = 1;
}

int print_card_info() {
	uint32_t counter = 0;
	int ret = 0;
	while (counter < 10000 && _opn_completed == 0) {
		counter++;
		if (_pa_state == PA_CONTEXT_READY && operation == NULL) {
			_pa_card_info_cb_t = pa_card_info_cb_t(pa_card_info_cb);
			operation = pa_context_get_card_info_list(context, _pa_card_info_cb_t, NULL);
		}
		pa_mainloop_iterate(mainloop, 0, &ret);
	}

	json result = {
		{"cards", _cards},
		{"ports", _ports}
	};

	std::cout << result.dump(5) << std::endl;

	return ret;
}

int main(int argc, char *argv[]) {
	int ret = 1;

	/* Set up a new main loop */
	if (!(mainloop = pa_mainloop_new())) {
		fprintf(stderr, "pa_mainloop_new() failed.\n");
		goto quit;
	}

	mainloop_api = pa_mainloop_get_api(mainloop);

	/* Create a new connection context */
	if (!(context = pa_context_new(mainloop_api, CLIENT_NAME))) {
		fprintf(stderr, "pa_context_new() failed.\n");
		goto quit;
	}

	/* Create the callback */
	_pa_context_notify_cb_t = pa_context_notify_cb_t(pa_context_notify_cb);
	pa_context_set_state_callback(context, _pa_context_notify_cb_t, NULL);

	/* Connect the context */
	if (pa_context_connect(context, NULL, (pa_context_flags)0, NULL) < 0) {
		fprintf(stderr, "pa_context_connect() failed: %s\n", pa_strerror(pa_context_errno(context)));
		goto quit;
	}


	ret = print_card_info();

quit:
	if (operation)
		pa_operation_unref(operation);

	if (context) {
		pa_context_unref(context);
		pa_context_disconnect(context);
	}

	if (mainloop) {
		pa_mainloop_free(mainloop);
	}

	return ret;
}
