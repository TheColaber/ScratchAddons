export default {
  data() {
    return {
      page: 0,
    };
  },

  computed: {
    data() {
      return [
        {
          icon: "../../images/icon.svg",
          title: "Welcome to a new Scratch.",
          desc: `With over 100 customizable addons,
          <br />
          your Scratch experience will never be the same.`,
          button: "Get Started!",
        },
        {
          title: "Pick a theme",
          desc: `This will affect the theme of the settings page,
          <br />
          popup, and other pages within the extension.`,
          select: [
            {
              title: "Light",
              img: "../../images/settings/light.svg",
              selected: () => this.$settingsContext.theme,
              click: () => this.$settingsContext.setTheme(true),
            },
            {
              title: "Dark",
              dark: true,
              img: "../../images/settings/dark.svg",
              selected: () => !this.$settingsContext.theme,
              click: () => this.$settingsContext.setTheme(false),
            },
          ],
          button: "Next",
          buttonNote: "You can always change this later.",
        },
        {
          title: "Customize the Scratch Website",
          desc: `You can enable more addons
          <br />
          and make advanced changeds in the settings page.`,
          select: [
            this.addonSelectOption("scratchr2"),
            this.addonSelectOption("studio-tools"),
            this.addonSelectOption("full-signature"),
            this.addonSelectOption("better-featured-project"),
            this.addonSelectOption("exact-count"),
          ],
          button: "Next",
          buttonNote: "You can always change this later.",
        },
        {
          title: "Customize the Project Player",
          desc: `You can enable more addons
          <br />
          and make advanced changeds in the settings page.`,
          select: [
            this.addonSelectOption("pause"),
            this.addonSelectOption("progress-bar"),
            this.addonSelectOption("60fps"),
            this.addonSelectOption("mute-project"),
            this.addonSelectOption("gamepad"),
          ],
          button: "Next",
          buttonNote: "You can always change this later.",
        },
        {
          title: "Customize the Editor",
          desc: `You can enable more addons
          <br />
          and make advanced changeds in the settings page.`,
          select: [
            this.addonSelectOption("editor-devtools"),
            this.addonSelectOption("editor-searchable-dropdowns"),
            this.addonSelectOption("block-switching"),
            this.addonSelectOption("folders"),
            this.addonSelectOption("cat-blocks"),
            this.addonSelectOption("clones"),
          ],
          button: "Next",
          buttonNote: "You can always change this later.",
        },
        {
          title: "Customize the Popup",
          desc: `These features let you manage Scratch
          <br />
          from the extension icon.`,
          select: [
            this.addonSelectOption("scratch-messaging"),
            this.addonSelectOption("msg-count-badge"),
            this.addonSelectOption("scratch-notifier"),
            this.addonSelectOption("cloud-games"),
          ],
          button: "Next",
          buttonNote: "You can always change this later.",
        },
        {
          icon: "../../../images/settings/party.svg",
          title: "You're all set!",
          desc: `Go ahead and try out your new addons,
          <br />
          or browse even more options in the settings.`,
          button: "Open settings",
        },
      ];
    },
  },

  methods: {
    nextPage() {
      this.page++;
    },

    addonSelectOption(id) {
      if (!this.$settingsContext.loaded) return;
      const manifest = this.$settingsContext.manifestsById[id];
      return {
        title: manifest.name,
        tooltip: manifest.description,
        img: `https://scratchaddons.com/assets/img/addons/${id}.png`,
        selected: () => manifest._enabled,
        click: () => this.enableAddon(id, !manifest._enabled),
      };
    },

    enableAddon(addonId, enabled) {
      chrome.runtime.sendMessage({ changeEnabledState: { addonId, newState: enabled } });
      const addon = this.$settingsContext.manifestsById[addonId];
      addon._wasEverEnabled = enabled;
      addon._enabled = enabled;
    },
  },
};
