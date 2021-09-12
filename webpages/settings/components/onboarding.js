export default {
  data() {
    return {
      onboardingPage: 1,
      scratchDark: false,
    };
  },

  methods: {
    nextPage() {
      if (this.onboardingPage === 2) {
        this.enableAddon("dark-www", this.scratchDark);
        this.enableAddon("editor-dark-mode", this.scratchDark);
      }
      this.onboardingPage++;
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
