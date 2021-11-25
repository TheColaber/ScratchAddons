export default async function ({ template }) {
  const AddonSetting = Vue.extend({
    props: ["addon", "setting", "addon-settings"],
    template,
    data() {
      return {
        noResetDropdown: ["table", "boolean", "select"].includes(this.setting.type),
      };
    },
    computed: {
      show() {
        if (!this.setting.if) return true;

        if (this.setting.if.addonEnabled) {
          const arr = Array.isArray(this.setting.if.addonEnabled)
            ? this.setting.if.addonEnabled
            : [this.setting.if.addonEnabled];
          if (arr.some((addon) => this.$root.manifestsById[addon]._enabled === true)) return true;
        }

        if (this.setting.if.settings) {
          const anyMatches = Object.keys(this.setting.if.settings).some((settingName) => {
            const arr = Array.isArray(this.setting.if.settings[settingName])
              ? this.setting.if.settings[settingName]
              : [this.setting.if.settings[settingName]];
            return arr.some((possibleValue) => this.addonSettings[settingName] === possibleValue);
          });
          if (anyMatches === true) return true;
        }

        return false;
      },
    },
    methods: {
      settingsName(addon) {
        const name = this.setting.name;
        const regex = /([\\]*)(@|#)([a-zA-Z0-9.\-\/_]*)/g;
        return name.replace(regex, (icon) => {
          if (icon[0] === "\\") {
            return icon.slice(1);
          }
          if (icon[0] === "@") {
            return `<img class="inline-icon" src="../../images/icons/${icon.split("@")[1]}"/>`;
          }
          if (icon[0] === "#") {
            return `<img class="inline-icon" src="../../addons/${addon._addonId}/${icon.split("#")[1]}"/>`;
          }
        });
      },

      showResetDropdown() {
        return (
          this.addon.presets &&
          this.addon.presets.some((preset) =>
            Object.prototype.hasOwnProperty.call(preset.values, this.setting.id) && this.setting.type === "color"
              ? preset.values[this.setting.id].toLowerCase() !== this.setting.default.toLowerCase()
              : preset.values[this.setting.id] !== this.setting.default
          )
        );
      },
      checkValidity() {
        // Needed to get just changed input to enforce it's min, max, and integer rule if the user "manually" sets the input to a value.
        let input = this.$event.target;
        this.addonSettings[this.setting.id] = input.validity.valid ? input.value : this.setting.default;
      },
      keySettingKeyDown(e) {
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
      },
      keySettingKeyUp(e) {
        // Ctrl by itself isn't a hotkey
        if (e.target.value === "Ctrl") e.target.value = "";
        this.updateOption(e.target.value);
      },
      getTableSetting(id) {
        return this.setting.row.find((setting) => setting.id === id);
      },
      deleteTableRow(i) {
        this.addonSettings[this.setting.id].splice(i, 1);
        this.updateSettings();
      },
      addTableRow(items = []) {
        let settings = {};
        this.setting.row.map((column) => column.id).forEach((id, i) => (settings[id] = items[i] || ""));
        this.addonSettings[this.setting.id].push(settings);
        this.updateSettings();
      },
      msg(...params) {
        return this.$root.msg(...params);
      },
      updateSettings(...params) {
        if (!params[0]) params[0] = this.addon;
        this.$root.updateSettings(...params);
      },
      updateOption(newValue) {
        this.addonSettings[this.setting.id] = newValue;
        this.updateSettings();
      },
    },
    events: {
      closePickers(...params) {
        return this.$root.closePickers(...params);
      },
      closeResetDropdowns(...params) {
        return this.$root.closeResetDropdowns(...params);
      },
    },
    directives: {
      sortable() {
        const sortable = new window.Sortable(this.el, {
          handle: ".handle",
          animation: 300,
          onUpdate: (event) => {
            let list = this.vm.addonSettings[this.vm.setting.id];
            list.splice(event.newIndex, 0, list.splice(event.oldIndex, 1)[0]);
            this.vm.updateSettings();
          },
          disabled: !this.vm.addon._enabled,
        });
        this.vm.$parent.$on("toggle-addon-request", (state) => {
          sortable.option("disabled", !state);
        });
      },
    },
  });
  Vue.component("addon-setting", AddonSetting);
}
