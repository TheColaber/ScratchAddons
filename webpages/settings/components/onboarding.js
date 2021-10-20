export default {
  data() {
    return {
      onboardingPage: 1,
    };
  },

  methods: {
    nextPage() {
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
