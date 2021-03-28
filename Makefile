INSTALL_DIR=~/.local/share/gnome-shell/extensions

.PHONY: all
all: build install

.PHONY: build
build:
	# ./update-and-compile-translations.sh
	glib-compile-schemas ./sound-output-device-chooser@kgshank.net/schemas

.PHONY: install
install:
	@echo "Installing extension files in $(INSTALL_DIR)/sound-output-device-chooser@kgshank.net"
	cp -r sound-output-device-chooser@kgshank.net  $(INSTALL_DIR)
