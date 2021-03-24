INSTALL_DIR=~/.local/share/gnome-shell/extensions

all: build install

build:
    # ./update-and-compile-translations.sh
    glib-compile-schemas ./sound-output-device-chooser@kgshank.net/schemas

install:
    @echo "Installing extension files in $(INSTALL_DIR)/sound-output-device-chooser@kgshank.net"
    cp -r sound-output-device-chooser@kgshank.net  $(INSTALL_DIR)
