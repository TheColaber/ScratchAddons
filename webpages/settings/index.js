import downloadBlob from "../../libraries/common/cs/download-blob.js";
import getDirection from "../rtl-list.js";
import loadVueComponent from "../../libraries/common/load-vue-components.js";
import tags from "./data/tags.js";
import addonGroups from "./data/addon-groups.js";
import categories from "./data/categories.js";

let isIframe = false;
if (window.parent !== window) {
  // We're in a popup!
  document.body.classList.add("iframe");
  isIframe = true;
}

let vue;

let initialTheme;
let initialThemePath;
const lightThemeLink = document.createElement("link");
lightThemeLink.setAttribute("rel", "stylesheet");
lightThemeLink.setAttribute("href", "light.css");
chrome.storage.sync.get(["globalTheme"], function ({ globalTheme = false }) {
  if (globalTheme === true) {
    document.head.appendChild(lightThemeLink);
  }
  const themePath = globalTheme ? "../../images/icons/moon.svg" : (initialThemePath = "../../images/icons/theme.svg");
  if (vue) {
    vue.theme = globalTheme;
    vue.themePath = themePath;
  } else {
    initialTheme = globalTheme;
    initialThemePath = themePath;
  }
  if (!isIframe) document.body.style.display = "";
});

(async () => {
  await loadVueComponent([
    "webpages/settings/components/picker-component",
    "webpages/settings/components/reset-dropdown",
    "webpages/settings/components/addon-setting",
    "webpages/settings/components/addon-tag",
    "webpages/settings/components/addon-group",
    "webpages/settings/components/addon-body",
    "webpages/settings/components/category-selector",
  ]);

  Vue.directive("click-outside", {
    priority: 700,
    bind() {
      let self = this;
      this.event = function (event) {
        self.vm.$emit(self.expression, event);
      };
      this.el.addEventListener("mousedown", this.stopProp);
      document.body.addEventListener("mousedown", this.event);
    },

    unbind() {
      this.el.removeEventListener("mousedown", this.stopProp);
      document.body.removeEventListener("mousedown", this.event);
    },
    stopProp(event) {
      event.stopPropagation();
    },
  });

  const browserLevelPermissions = ["notifications"];
  if (typeof browser !== "undefined") browserLevelPermissions.push("clipboardWrite");
  let grantedOptionalPermissions = [];
  const updateGrantedPermissions = () =>
    chrome.permissions.getAll(({ permissions }) => {
      grantedOptionalPermissions = permissions.filter((p) => browserLevelPermissions.includes(p));
    });
  updateGrantedPermissions();
  chrome.permissions.onAdded?.addListener(updateGrantedPermissions);
  chrome.permissions.onRemoved?.addListener(updateGrantedPermissions);

  const promisify =
    (callbackFn) =>
    (...args) =>
      new Promise((resolve) => callbackFn(...args, resolve));

  let handleConfirmClicked = null;

  const serializeSettings = async () => {
    const syncGet = promisify(chrome.storage.sync.get.bind(chrome.storage.sync));
    const storedSettings = await syncGet(["globalTheme", "addonSettings", "addonsEnabled"]);
    const serialized = {
      core: {
        lightTheme: storedSettings.globalTheme,
        version: chrome.runtime.getManifest().version_name,
      },
      addons: {},
    };
    for (const addonId of Object.keys(storedSettings.addonsEnabled)) {
      serialized.addons[addonId] = {
        enabled: storedSettings.addonsEnabled[addonId],
        settings: storedSettings.addonSettings[addonId] || {},
      };
    }
    return JSON.stringify(serialized);
  };

  const deserializeSettings = async (str, manifests, confirmElem) => {
    const obj = JSON.parse(str);
    const syncGet = promisify(chrome.storage.sync.get.bind(chrome.storage.sync));
    const syncSet = promisify(chrome.storage.sync.set.bind(chrome.storage.sync));
    const { addonSettings, addonsEnabled } = await syncGet(["addonSettings", "addonsEnabled"]);
    const pendingPermissions = {};
    for (const addonId of Object.keys(obj.addons)) {
      const addonValue = obj.addons[addonId];
      const addonManifest = manifests.find((m) => m._addonId === addonId);
      if (!addonManifest) continue;
      const permissionsRequired = addonManifest.permissions || [];
      const browserPermissionsRequired = permissionsRequired.filter((p) => browserLevelPermissions.includes(p));
      console.log(addonId, permissionsRequired, browserPermissionsRequired);
      if (addonValue.enabled && browserPermissionsRequired.length) {
        pendingPermissions[addonId] = browserPermissionsRequired;
      } else {
        addonsEnabled[addonId] = addonValue.enabled;
      }
      addonSettings[addonId] = Object.assign({}, addonSettings[addonId], addonValue.settings);
    }
    if (handleConfirmClicked) confirmElem.removeEventListener("click", handleConfirmClicked, { once: true });
    let resolvePromise = null;
    const resolveOnConfirmPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    handleConfirmClicked = async () => {
      handleConfirmClicked = null;
      if (Object.keys(pendingPermissions).length) {
        const granted = await promisify(chrome.permissions.request.bind(chrome.permissions))({
          permissions: Object.values(pendingPermissions).flat(),
        });
        console.log(pendingPermissions, granted);
        Object.keys(pendingPermissions).forEach((addonId) => {
          addonsEnabled[addonId] = granted;
        });
      }
      await syncSet({
        globalTheme: !!obj.core.lightTheme,
        addonsEnabled,
        addonSettings,
      });
      resolvePromise();
    };
    confirmElem.classList.remove("hidden-button");
    confirmElem.addEventListener("click", handleConfirmClicked, { once: true });
    return resolveOnConfirmPromise;
  };

  vue = window.vue = new Vue({
    el: "body",
    data() {
      return {
        smallMode: false,
        theme: initialTheme ?? false,
        themePath: initialThemePath ?? "",
        switchPath: "../../images/icons/switch.svg",
        isOpen: false,
        canCloseOutside: false,
        categoryOpen: true,
        loaded: false,
        searchLoaded: false,
        manifests: [],
        manifestsById: {},
        searchAddonOrder: [],
        selectedCategory: "all",
        searchInput: "",
        searchInputReal: "",
        addonSettings: {},
        addonToEnable: null,
        showPopupModal: false,
        isIframe,
        addonGroups: addonGroups.filter((g) => (isIframe ? g.iframeShow : g.fullscreenShow)),
        categories,
        searchMsg: this.msg("search"),
        browserLevelPermissions,
        grantedOptionalPermissions,
      };
    },
    computed: {
      version() {
        return chrome.runtime.getManifest().version;
      },
      versionName() {
        return chrome.runtime.getManifest().version_name;
      },
      addonAmt() {
        return `${Math.floor(this.manifests.length / 5) * 5}+`;
      },
    },

    methods: {
      modalToggle: function () {
        this.closePickers();
        this.isOpen = !this.isOpen;
        if (vue.smallMode) {
          vue.sidebarToggle();
        }
        this.canCloseOutside = false;
        setTimeout(() => {
          this.canCloseOutside = true;
        }, 100);
      },
      sidebarToggle: function () {
        this.categoryOpen = !this.categoryOpen;
        if (this.categoryOpen) {
          vue.switchPath = "../../images/icons/close.svg";
        } else {
          vue.switchPath = "../../images/icons/switch.svg";
        }
      },
      msg(message, ...params) {
        return chrome.i18n.getMessage(message, ...params);
      },
      direction() {
        return getDirection(chrome.i18n.getUILanguage());
      },
      openReview() {
        if (typeof browser !== "undefined") {
          window.open(`https://addons.mozilla.org/en-US/firefox/addon/scratch-messaging-extension/reviews/`);
        } else {
          window.open(
            `https://chrome.google.com/webstore/detail/scratch-addons/fbeffbjdlemaoicjdapfpikkikjoneco/reviews`
          );
        }
      },
      openPage(page) {
        window.open(page);
      },
      openFeedback() {
        window.open(`https://scratchaddons.com/feedback?version=${chrome.runtime.getManifest().version_name}`);
      },
      clearSearch() {
        this.searchInputReal = "";
      },
      setTheme(mode) {
        chrome.storage.sync.get(["globalTheme"], function (r) {
          let rr = mode ?? true;
          chrome.storage.sync.set({ globalTheme: rr }, function () {
            if (rr && r.globalTheme !== rr) {
              document.head.appendChild(lightThemeLink);
              vue.theme = true;
              vue.themePath = "../../images/icons/moon.svg";
            } else if (r.globalTheme !== rr) {
              document.head.removeChild(lightThemeLink);
              vue.theme = false;
              vue.themePath = "../../images/icons/theme.svg";
            }
          });
        });
      },
      stopPropagation(e) {
        e.stopPropagation();
      },
      updateOption(id, newValue, addon) {
        this.addonSettings[addon._addonId][id] = newValue;
        this.updateSettings(addon);
      },
      updateSettings(addon, { wait = 0, settingId = null } = {}) {
        const value = settingId && this.addonSettings[addon._addonId][settingId];
        setTimeout(() => {
          if (!settingId || this.addonSettings[addon._addonId][settingId] === value) {
            chrome.runtime.sendMessage({
              changeAddonSettings: { addonId: addon._addonId, newSettings: this.addonSettings[addon._addonId] },
            });
            console.log("Updated", this.addonSettings[addon._addonId]);
          }
        }, wait);
      },
      closePickers(e, leaveOpen, { callCloseDropdowns = true } = {}) {
        this.$emit("close-pickers", leaveOpen);
        if (callCloseDropdowns) this.closeResetDropdowns();
      },
      closeResetDropdowns(e, leaveOpen) {
        this.$emit("close-reset-dropdowns", leaveOpen);
      },
      exportSettings() {
        serializeSettings().then((serialized) => {
          const blob = new Blob([serialized], { type: "application/json" });
          downloadBlob("scratch-addons-settings.json", blob);
        });
      },
      importSettings() {
        const inputElem = Object.assign(document.createElement("input"), {
          hidden: true,
          type: "file",
          accept: "application/json",
        });
        inputElem.addEventListener(
          "change",
          async (e) => {
            console.log(e);
            const file = inputElem.files[0];
            if (!file) {
              inputElem.remove();
              alert(chrome.i18n.getMessage("fileNotSelected"));
              return;
            }
            const text = await file.text();
            inputElem.remove();
            const confirmElem = document.getElementById("confirmImport");
            try {
              await deserializeSettings(text, vue.manifests, confirmElem);
            } catch (e) {
              console.warn("Error when importing settings:", e);
              confirmElem.classList.add("hidden-button");
              alert(chrome.i18n.getMessage("importFailed"));
              return;
            }
            alert(chrome.i18n.getMessage("importSuccess"));
            chrome.runtime.reload();
          },
          { once: true }
        );
        document.body.appendChild(inputElem);
        inputElem.click();
      },
      openFullSettings() {
        window.open(
          `${chrome.runtime.getURL("webpages/settings/index.html")}#addon-${
            this.addonToEnable && this.addonToEnable._addonId
          }`
        );
        setTimeout(() => window.parent.close(), 100);
      },
      hidePopup() {
        document.querySelector(".popup").style.animation = "closePopup 1.6s 1";
        document.querySelector(".popup").addEventListener(
          "animationend",
          () => {
            this.showPopupModal = false;
          },
          { once: true }
        );
      },
    },
    events: {
      closesidebar(event) {
        if (event?.target.classList[0] === "toggle") return;
        if (this.categoryOpen && this.smallMode) {
          this.sidebarToggle();
        }
      },
      modalClickOutside: function (e) {
        if (this.isOpen && this.canCloseOutside && e.isTrusted) {
          this.isOpen = false;
        }
      },
    },
    watch: {
      searchInputReal(newValue) {
        if (this.searchLoaded) this.searchInput = newValue;
      },
    },
    ready() {
      // Needed in Firefox and slower Chrome - autofocus is weird
      document.getElementById("searchBox")?.focus();
    },
  });

  const getRunningAddons = (manifests, addonsEnabled) => {
    return new Promise((resolve) => {
      chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
        if (!tabs[0].id) return;
        chrome.tabs.sendMessage(tabs[0].id, "getRunningAddons", { frameId: 0 }, (res) => {
          // Just so we don't get any errors in the console if we don't get any response from a non scratch tab.
          void chrome.runtime.lastError;
          const addonsCurrentlyOnTab = res ? [...res.userscripts, ...res.userstyles] : [];
          const addonsPreviouslyOnTab = res ? res.disabledDynamicAddons : [];
          resolve({ addonsCurrentlyOnTab, addonsPreviouslyOnTab });
        });
      });
    });
  };

  chrome.runtime.sendMessage("getSettingsInfo", async ({ manifests, addonsEnabled, addonSettings }) => {
    vue.addonSettings = addonSettings;
    let iframeData;
    if (isIframe) {
      iframeData = await getRunningAddons(manifests, addonsEnabled);
    }
    for (const { manifest, addonId } of manifests) {
      manifest._categories = [];
      manifest._categories[0] = manifest.tags.includes("popup")
        ? "popup"
        : manifest.tags.includes("easterEgg")
        ? "easterEgg"
        : manifest.tags.includes("theme")
        ? "theme"
        : manifest.tags.includes("community")
        ? "community"
        : "editor";

      const addCategoryIfTag = (arr) => {
        let count = 0;
        for (const objOrString of arr) {
          const tagName = typeof objOrString === "object" ? objOrString.tag : objOrString;
          const categoryName = typeof objOrString === "object" ? objOrString.category : tagName;
          if (manifest.tags.includes(tagName)) {
            manifest._categories.push(categoryName);
            count++;
          }
        }
        return count;
      };
      if (manifest._categories[0] === "theme") {
        // All themes should have either "editor" or "community" tag
        addCategoryIfTag([
          {
            tag: "editor",
            category: "themesForEditor",
          },
        ]) ||
          addCategoryIfTag([
            {
              tag: "community",
              category: "themesForWebsite",
            },
          ]);
      } else if (manifest._categories[0] === "editor") {
        const addedCategories = addCategoryIfTag(["codeEditor", "costumeEditor", "projectPlayer"]);
        if (addedCategories === 0) manifest._categories.push("editorOthers");
      } else if (manifest._categories[0] === "community") {
        const addedCategories = addCategoryIfTag(["profiles", "projectPage", "forums"]);
        if (addedCategories === 0) manifest._categories.push("communityOthers");
      }

      // Exception: show cat-blocks after konami code, even tho
      // it's categorized as an editor addon, not as easterEgg
      if (addonId === "cat-blocks") manifest._categories.push("easterEgg");

      manifest._icon = manifest._categories[0];

      manifest._enabled = addonsEnabled[addonId];
      manifest._addonId = addonId;
      manifest._groups = [];

      if (manifest.versionAdded) {
        const [extMajor, extMinor, _] = vue.version.split(".");
        const [addonMajor, addonMinor, __] = manifest.versionAdded.split(".");
        if (extMajor === addonMajor && extMinor === addonMinor) {
          manifest.tags.push("new");
          manifest._groups.push("new");
        }
      }

      // Sort tags to preserve consistent order
      const order = tags.map((obj) => obj.matchName);
      manifest.tags.sort((b, a) => order.indexOf(b) - order.indexOf(a));

      // Iframe only
      if (iframeData?.addonsCurrentlyOnTab.includes(addonId)) manifest._groups.push("runningOnTab");
      else if (iframeData?.addonsPreviouslyOnTab.includes(addonId)) manifest._groups.push("recentlyUsed");

      if (manifest._enabled) manifest._groups.push("enabled");
      else {
        // Addon is disabled
        if (manifest.tags.includes("recommended")) manifest._groups.push("recommended");
        else if (manifest.tags.includes("beta") || manifest.tags.includes("danger")) manifest._groups.push("beta");
        else if (manifest.tags.includes("featured")) manifest._groups.push("featured");
        else manifest._groups.push("others");
      }

      for (const groupId of manifest._groups) {
        vue.addonGroups.find((g) => g.id === groupId)?.addonIds.push(manifest._addonId);
      }

      Vue.set(vue.manifestsById, manifest._addonId, manifest);
    }
    vue.manifests = manifests.map(({ manifest }) => manifest);

    const checkTag = (tagOrTags, manifestA, manifestB) => {
      const tags = Array.isArray(tagOrTags) ? tagOrTags : [tagOrTags];
      const aHasTag = tags.some((tag) => manifestA.tags.includes(tag));
      const bHasTag = tags.some((tag) => manifestB.tags.includes(tag));
      if (aHasTag ^ bHasTag) {
        // If only one has the tag
        return bHasTag - aHasTag;
      } else if (aHasTag && bHasTag) return manifestA.name.localeCompare(manifestB.name);
      else return null;
    };
    const order = [["danger", "beta"], "editor", "community", "popup"];

    vue.addonGroups.forEach((group) => {
      group.addonIds = group.addonIds
        .map((id) => vue.manifestsById[id])
        .sort((manifestA, manifestB) => {
          for (const tag of order) {
            const val = checkTag(tag, manifestA, manifestB);
            if (val !== null) return val;
          }
          return 0; // just to suppress linter
        })
        .map((addon) => addon._addonId);
    });

    // Define order when searching. Temporal until we
    // can sort by relevance depending on the query
    vue.searchAddonOrder = manifests
      .sort((a, b) => {
        if (a.manifest._enabled ^ b.manifest._enabled) return b.manifest._enabled - a.manifest._enabled;
        else return a.manifest.name.localeCompare(b.manifest.name);
      })
      .map((obj) => obj.addonId);

    vue.loaded = true;
    if (isIframe) setTimeout(() => document.getElementById("searchBox").focus(), 0);
    let i = 0;
    document.getElementById("searchBox").addEventListener("input", function thisFunction() {
      i++;
      let thisI = i;
      setTimeout(() => {
        if (i === thisI) {
          vue.searchLoaded = true;
          vue.searchInput = vue.searchInputReal;
          document.getElementById("searchBox").removeEventListener("input", thisFunction);
        }
      }, 350);
    });
    setTimeout(handleKeySettings, 0);
    setTimeout(() => {
      // Set hash again after loading addons, to force scroll to addon
      let hash = window.location.hash;
      if (hash) {
        window.location.hash = "";
        window.location.hash = hash;
        if (hash.startsWith("#addon-")) {
          const groupWithAddon = vue.$children.find(
            (child) =>
              child.$options.name === "addon-group" &&
              child.$children.find((addon) => "#addon-" + addon.addon._addonId === location.hash)
          );
          if (groupWithAddon && !groupWithAddon.group.expanded) groupWithAddon.toggle();
        }
      }
    }, 0);
  });

  function handleKeySettings() {
    let keyInputs = document.querySelectorAll(".key");
    for (const input of keyInputs) {
      input.addEventListener("keydown", function (e) {
        e.preventDefault();
        e.target.value = e.ctrlKey
          ? "Ctrl" +
            (e.shiftKey ? " + Shift" : "") +
            (e.key === "Control" || e.key === "Shift"
              ? ""
              : (e.ctrlKey ? " + " : "") +
                (e.key.toUpperCase() === e.key
                  ? e.code.includes("Digit")
                    ? e.code.substring(5, e.code.length)
                    : e.key
                  : e.key.toUpperCase()))
          : "";
        vue.updateOption(
          e.target.getAttribute("data-setting-id"),
          e.target.value,
          vue.manifests.find((manifest) => manifest._addonId === e.target.getAttribute("data-addon-id"))
        );
      });
      input.addEventListener("keyup", function (e) {
        // Ctrl by itself isn't a hotkey
        if (e.target.value === "Ctrl") e.target.value = "";
      });
    }
  }

  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key === "f") {
      e.preventDefault();
      document.querySelector("#searchBox").focus();
    } else if (e.key === "Escape" && document.activeElement === document.querySelector("#searchBox")) {
      e.preventDefault();
      vue.searchInputReal = "";
    }
  });

  document.title = chrome.i18n.getMessage("settingsTitle");
  function resize() {
    if (window.innerWidth < 1000) {
      vue.smallMode = true;
      vue.categoryOpen = false;
      vue.switchPath = "../../images/icons/switch.svg";
    } else if (vue.smallMode !== false) {
      vue.smallMode = false;
      vue.categoryOpen = true;
      vue.switchPath = "../../images/icons/close.svg";
    }
  }
  window.onresize = resize;
  resize();

  // Konami code easter egg
  let cursor = 0;
  const KONAMI_CODE = [
    "ArrowUp",
    "ArrowUp",
    "ArrowDown",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowLeft",
    "ArrowRight",
    "KeyB",
    "KeyA",
  ];
  document.addEventListener("keydown", (e) => {
    cursor = e.code === KONAMI_CODE[cursor] ? cursor + 1 : 0;
    if (cursor === KONAMI_CODE.length) {
      vue.selectedCategory = "easterEgg";
      setTimeout(() => (vue.searchInputReal = ""), 0); // Allow konami code in autofocused search bar
    }
  });

  chrome.runtime.sendMessage("checkPermissions");
})();
