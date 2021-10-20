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
          showIcon: true,
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
