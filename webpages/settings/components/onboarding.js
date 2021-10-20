export default {
  data() {
    return {
      page: 0,
      data: [
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
      ],
    };
  },

  methods: {
    nextPage() {
      this.page++;
    },

    enableAddon(addonId, enabled) {
      chrome.runtime.sendMessage({ changeEnabledState: { addonId, newState: enabled } });
      const addon = this.getManifest(addonId);
      addon._wasEverEnabled = enabled;
      addon._enabled = enabled;
    },

    getManifest(addonId) {
      const { manifests } = this.$settingsContext;
      return manifests.find(({ _addonId }) => _addonId === addonId);
    },
  },
};
