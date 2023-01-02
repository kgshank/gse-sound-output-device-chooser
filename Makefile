INSTALL_DIR=~/.local/share/gnome-shell/extensions
SRC_DIR=sound-output-device-chooser@kgshank.net
LOCALE_SRC=$(shell find $(SRC_DIR) -regextype posix-extended -regex '.*\.(js|glade)' 2> /dev/null)
LOCALE_DIR=$(SRC_DIR)/locale
POT_FILE=$(SRC_DIR)/sound-output-device-chooser.pot
PO_FILES=$(wildcard $(LOCALE_DIR)/*/LC_MESSAGES/*.po)
MO_FILES=$(PO_FILES:.po=.mo)

.PHONY: all
all: build install

.PHONY: build
build: $(MO_FILES)
	glib-compile-schemas $(SRC_DIR)/schemas

.PHONY: potfile
potfile:
	make $(POT_FILE)

.PHONY: mergepo
mergepo: $(POT_FILE)
	@for po in $(PO_FILES); \
	do \
		msgmerge --add-location --backup=none --sort-output --update $${po} $(POT_FILE); \
	done;

$(POT_FILE): $(LOCALE_SRC)
	@xgettext \
	--add-comments='Translators:' \
	--add-location \
	--from-code=utf-8 \
	--keyword \
	--keyword=_ \
	--keyword=D_:2 \
	--keyword=DC_:2 \
	--keyword=DN_:2,3 \
	--keyword=DP_:2c,3 \
	--keyword=N_:1,2 \
	--keyword=P_:1c,2 \
	--output=$@ \
	--package-name=sound-output-device-chooser \
	--sort-output \
	$^

$(LOCALE_DIR)/%/LC_MESSAGES/sound-output-device-chooser.mo: $(LOCALE_DIR)/%/LC_MESSAGES/sound-output-device-chooser.po
	msgfmt --check --output-file=$@ $<

.PHONY: install
install:
	@echo "Installing extension files in $(INSTALL_DIR)/sound-output-device-chooser@kgshank.net"
	mkdir -p $(INSTALL_DIR)
	cp -r $(SRC_DIR)  $(INSTALL_DIR)

enable:
	gnome-extensions enable $(SRC_DIR)

disable:
	gnome-extensions disable $(SRC_DIR)
