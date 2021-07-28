export default async function ({ addon, msg, global, console }) {
  const button = document.createElement("button");
  button.className = addon.tab.scratchClass("backpack_more", "sa_clear_backpack");
  const span = document.createElement("span");
  span.innerText = "Clear";
  button.append(span);
  button.addEventListener("click", (e) => {
    Backpack.state.contents.forEach(({ id }) => {
      console.log(Backpack.handleDelete(id));
    });
  });

  const REACT_INTERNAL_PREFIX = "__reactInternalInstance$";
  let spriteSelectorItemElement = await addon.tab.waitForElement("[class^='sprite-selector_sprite-wrapper']");
  let reactInternalKey = Object.keys(spriteSelectorItemElement).find((i) => i.startsWith(REACT_INTERNAL_PREFIX));

  let backpackEl = await addon.tab.waitForElement("[class^='backpack_backpack-list_']");
  let GUI = backpackEl.closest('[class*="gui_editor-wrapper"]');
  const Backpack = GUI[reactInternalKey].child.sibling.child.stateNode;
  console.log(Backpack);

  let oldGetContents = Backpack.getContents;
  Backpack.getContents = function () {
    oldGetContents.call(this);
    // console.log("e", Backpack.state.expanded, Backpack.state.contents.length);
    // if (Backpack.state.expanded && Backpack.state.contents.length && !backpackList.querySelector("sa_clear_backpack")) {
    // backpackList.append(button);
    // console.log(backpackList);
    console.log("a");
    // }
  };

  while (true) {
    let backpackList = await addon.tab.waitForElement("[class^='backpack_backpack-list-inner']", { markAsSeen: true });
    if (Backpack.state.contents.length) {
      backpackList.append(button);
    }
    console.log("test");
  }
}
