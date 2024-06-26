// //@ts-check

// import WorkspaceQuerier, { QueryResult } from "./WorkspaceQuerier.js";
// import renderBlock, { BlockComponent, getBlockHeight } from "./BlockRenderer.js";
// import { BlockInstance, BlockShape, BlockTypeInfo } from "./BlockTypeInfo.js";
// import { onClearTextWidthCache } from "./module.js";

// export default async function ({ addon, msg, console }) {
//   const Blockly = await addon.tab.traps.getBlockly();
//   const vm = addon.tab.traps.vm;

//   const PREVIEW_LIMIT = 50;

//   const popupRoot = document.body.appendChild(document.createElement("div"));
//   popupRoot.classList.add("sa-mcp-root");
//   popupRoot.dir = addon.tab.direction;
//   popupRoot.style.display = "none";

//   const popupContainer = popupRoot.appendChild(document.createElement("div"));
//   popupContainer.classList.add("sa-mcp-container");

//   const popupInputContainer = popupContainer.appendChild(document.createElement("div"));
//   popupInputContainer.classList.add(addon.tab.scratchClass("input_input-form"));
//   popupInputContainer.classList.add("sa-mcp-input-wrapper");

//   const popupInputSuggestion = popupInputContainer.appendChild(document.createElement("input"));
//   popupInputSuggestion.classList.add("sa-mcp-input-suggestion");

//   const popupInput = popupInputContainer.appendChild(document.createElement("input"));
//   popupInput.classList.add("sa-mcp-input");
//   popupInput.setAttribute("autocomplete", "off");

//   const popupPreviewContainer = popupContainer.appendChild(document.createElement("div"));
//   popupPreviewContainer.classList.add("sa-mcp-preview-container");

//   const popupPreviewScrollbarSVG = popupContainer.appendChild(
//     document.createElementNS("http://www.w3.org/2000/svg", "svg")
//   );
//   popupPreviewScrollbarSVG.classList.add(
//     "sa-mcp-preview-scrollbar",
//     "blocklyScrollbarVertical",
//     "blocklyMainWorkspaceScrollbar"
//   );
//   popupPreviewScrollbarSVG.style.display = "none";

//   const popupPreviewScrollbarBackground = popupPreviewScrollbarSVG.appendChild(
//     document.createElementNS("http://www.w3.org/2000/svg", "rect")
//   );
//   popupPreviewScrollbarBackground.setAttribute("width", "11");
//   popupPreviewScrollbarBackground.classList.add("blocklyScrollbarBackground");

//   const popupPreviewScrollbarHandle = popupPreviewScrollbarSVG.appendChild(
//     document.createElementNS("http://www.w3.org/2000/svg", "rect")
//   );
//   popupPreviewScrollbarHandle.setAttribute("rx", "3");
//   popupPreviewScrollbarHandle.setAttribute("ry", "3");
//   popupPreviewScrollbarHandle.setAttribute("width", "6");
//   popupPreviewScrollbarHandle.setAttribute("x", "2.5");
//   popupPreviewScrollbarHandle.classList.add("blocklyScrollbarHandle");

//   const popupPreviewBlocks = popupPreviewContainer.appendChild(
//     document.createElementNS("http://www.w3.org/2000/svg", "svg")
//   );
//   popupPreviewBlocks.classList.add("sa-mcp-preview-blocks");

//   const querier = new WorkspaceQuerier();

//   let mousePosition = { x: 0, y: 0 };
//   document.addEventListener("mousemove", (e) => {
//     mousePosition = { x: e.clientX, y: e.clientY };
//   });

//   onClearTextWidthCache(closePopup);

//   /**
//    * @typedef ResultPreview
//    * @property {BlockInstance} block
//    * @property {((endOnly: boolean) => string)?} autocompleteFactory
//    * @property {BlockComponent} renderedBlock
//    * @property {SVGGElement} svgBlock
//    * @property {SVGRectElement} svgBackground
//    */
//   /** @type {ResultPreview[]} */
//   let queryPreviews = [];
//   /** @type {QueryResult | null} */
//   let queryIllegalResult = null;
//   let selectedPreviewIdx = 0;
//   /** @type {BlockTypeInfo[]?} */
//   let blockTypes = null;
//   let limited = false;

//   let allowMenuClose = true;

//   let popupPosition = null;
//   let popupOrigin = null;

//   let previewWidth = 0;
//   let previewHeight = 0;

//   let previewScale = 0;

//   let previewMinHeight = 0;
//   let previewMaxHeight = 0;

//   function openPopup() {
//     if (addon.self.disabled) return;

//     // Don't show the menu if we're not in the code editor
//     if (addon.tab.editorMode !== "editor") return;
//     if (addon.tab.redux.state.scratchGui.editorTab.activeTabIndex !== 0) return;

//     blockTypes = BlockTypeInfo.getBlocks(Blockly, vm, Blockly.getMainWorkspace(), msg);
//     querier.indexWorkspace([...blockTypes]);
//     blockTypes.sort((a, b) => {
//       const prio = (block) => ["operators", "data"].indexOf(block.category.name) - block.id.startsWith("data_");
//       return prio(b) - prio(a);
//     });

//     previewScale = window.innerWidth * 0.00005 + addon.settings.get("popup_scale") / 100;
//     previewWidth = (window.innerWidth * addon.settings.get("popup_width")) / 100;
//     previewMaxHeight = (window.innerHeight * addon.settings.get("popup_max_height")) / 100;

//     popupContainer.style.width = previewWidth + "px";

//     popupOrigin = { x: mousePosition.x, y: mousePosition.y };
//     popupRoot.style.display = "";
//     popupInput.value = "";
//     popupInput.focus();
//     updateInput();
//   }

//   function closePopup() {
//     if (allowMenuClose) {
//       popupOrigin = null;
//       popupPosition = null;
//       popupRoot.style.display = "none";
//       blockTypes = null;
//       querier.clearWorkspaceIndex();
//     }
//   }

//   popupInput.addEventListener("input", updateInput);

//   function updateInput() {
//     /**
//      * @typedef MenuItem
//      * @property {BlockInstance} block
//      * @property {(endOnly: boolean) => string} [autocompleteFactory]
//      */
//     /** @type {MenuItem[]} */
//     const blockList = [];

//     if (popupInput.value.trim().length === 0) {
//       queryIllegalResult = null;
//       if (blockTypes)
//         for (const blockType of blockTypes) {
//           blockList.push({
//             block: blockType.createBlock(),
//           });
//         }
//       limited = false;
//     } else {
//       // Get the list of blocks to display using the input content
//       const queryResultObj = querier.queryWorkspace(popupInput.value);
//       const queryResults = queryResultObj.results;
//       queryIllegalResult = queryResultObj.illegalResult;
//       limited = queryResultObj.limited;

//       if (queryResults.length > PREVIEW_LIMIT) queryResults.length = PREVIEW_LIMIT;

//       for (const queryResult of queryResults) {
//         blockList.push({
//           block: queryResult.getBlock(),
//           autocompleteFactory: (endOnly) => queryResult.toText(endOnly),
//         });
//       }
//     }

//     // @ts-ignore Delete the old previews
//     while (popupPreviewBlocks.firstChild) popupPreviewBlocks.removeChild(popupPreviewBlocks.lastChild);

//     // Create the new previews
//     queryPreviews.length = 0;
//     let y = 0;
//     for (let resultIdx = 0; resultIdx < blockList.length; resultIdx++) {
//       const result = blockList[resultIdx];

//       const mouseMoveListener = () => {
//         updateSelection(resultIdx);
//       };

//       const mouseDownListener = (e) => {
//         e.stopPropagation();
//         e.preventDefault();
//         updateSelection(resultIdx);
//         allowMenuClose = !e.shiftKey;
//         selectBlock();
//         allowMenuClose = true;
//         if (e.shiftKey) popupInput.focus();
//       };

//       const svgBackground = popupPreviewBlocks.appendChild(
//         document.createElementNS("http://www.w3.org/2000/svg", "rect")
//       );

//       const height = getBlockHeight(result.block);
//       svgBackground.setAttribute("transform", `translate(0, ${(y + height / 10) * previewScale})`);
//       svgBackground.setAttribute("height", height * previewScale + "px");
//       svgBackground.classList.add("sa-mcp-preview-block-bg");
//       svgBackground.addEventListener("mousemove", mouseMoveListener);
//       svgBackground.addEventListener("mousedown", mouseDownListener);

//       const svgBlock = popupPreviewBlocks.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "g"));
//       svgBlock.addEventListener("mousemove", mouseMoveListener);
//       svgBlock.addEventListener("mousedown", mouseDownListener);
//       svgBlock.classList.add("sa-mcp-preview-block");

//       const renderedBlock = renderBlock(result.block, svgBlock);

//       queryPreviews.push({
//         block: result.block,
//         autocompleteFactory: result.autocompleteFactory ?? null,
//         renderedBlock,
//         svgBlock,
//         svgBackground,
//       });

//       y += height;
//     }

//     const height = (y + 8) * previewScale;

//     if (height < previewMinHeight) previewHeight = previewMinHeight;
//     else if (height > previewMaxHeight) previewHeight = previewMaxHeight;
//     else previewHeight = height;

//     popupPreviewBlocks.setAttribute("height", `${height}px`);
//     popupPreviewContainer.style.height = previewHeight + "px";
//     popupPreviewScrollbarSVG.style.height = previewHeight + "px";
//     popupPreviewScrollbarBackground.setAttribute("height", "" + previewHeight);
//     popupInputContainer.dataset["error"] = "" + limited;

//     popupPosition = { x: popupOrigin.x + 16, y: popupOrigin.y - 8 };

//     const popupHeight = popupContainer.getBoundingClientRect().height;
//     const popupBottom = popupPosition.y + popupHeight;
//     if (popupBottom > window.innerHeight) {
//       popupPosition.y -= popupBottom - window.innerHeight;
//     }

//     popupRoot.style.top = popupPosition.y + "px";
//     popupRoot.style.left = popupPosition.x + "px";

//     selectedPreviewIdx = -1;
//     updateSelection(0);
//     updateCursor();
//     updateScrollbar();
//   }

//   function updateSelection(newIdx) {
//     if (selectedPreviewIdx === newIdx) return;

//     const oldSelection = queryPreviews[selectedPreviewIdx];
//     if (oldSelection) {
//       oldSelection.svgBackground.classList.remove("sa-mcp-preview-block-bg-selection");
//       oldSelection.svgBlock.classList.remove("sa-mcp-preview-block-selection");
//     }

//     if (queryPreviews.length === 0 && queryIllegalResult) {
//       popupInputSuggestion.value =
//         popupInput.value + queryIllegalResult.toText(true).substring(popupInput.value.length);
//       return;
//     }

//     const newSelection = queryPreviews[newIdx];
//     if (newSelection && newSelection.autocompleteFactory) {
//       newSelection.svgBackground.classList.add("sa-mcp-preview-block-bg-selection");
//       newSelection.svgBlock.classList.add("sa-mcp-preview-block-selection");

//       newSelection.svgBackground.scrollIntoView({
//         block: "nearest",
//         behavior: Math.abs(newIdx - selectedPreviewIdx) > 1 ? "smooth" : "auto",
//       });

//       popupInputSuggestion.value =
//         popupInput.value + newSelection.autocompleteFactory(true).substring(popupInput.value.length);
//     } else {
//       popupInputSuggestion.value = "";
//     }

//     selectedPreviewIdx = newIdx;
//   }

//   // @ts-ignore
//   document.addEventListener("selectionchange", updateCursor);

//   function updateCursor() {
//     const cursorPos = popupInput.selectionStart ?? 0;
//     const cursorPosRel = popupInput.value.length === 0 ? 0 : cursorPos / popupInput.value.length;

//     let y = 0;
//     for (let previewIdx = 0; previewIdx < queryPreviews.length; previewIdx++) {
//       const preview = queryPreviews[previewIdx];

//       var blockX = 5;
//       if (blockX + preview.renderedBlock.width > previewWidth / previewScale)
//         blockX += (previewWidth / previewScale - blockX - preview.renderedBlock.width) * previewScale * cursorPosRel;
//       var blockY = (y + 30) * previewScale;

//       preview.svgBlock.setAttribute("transform", `translate(${blockX}, ${blockY}) scale(${previewScale})`);

//       y += getBlockHeight(preview.block);
//     }

//     popupInputSuggestion.scrollLeft = popupInput.scrollLeft;
//   }

//   popupPreviewContainer.addEventListener("scroll", updateScrollbar);

//   function updateScrollbar() {
//     const scrollTop = popupPreviewContainer.scrollTop;
//     const scrollY = popupPreviewContainer.scrollHeight;

//     if (scrollY <= previewHeight) {
//       popupPreviewScrollbarSVG.style.display = "none";
//       return;
//     }

//     const scrollbarHeight = (previewHeight / scrollY) * previewHeight;
//     const scrollbarY = (scrollTop / scrollY) * previewHeight;

//     popupPreviewScrollbarSVG.style.display = "";
//     popupPreviewScrollbarHandle.setAttribute("height", "" + scrollbarHeight);
//     popupPreviewScrollbarHandle.setAttribute("y", "" + scrollbarY);
//   }

//   function selectBlock() {
//     const selectedPreview = queryPreviews[selectedPreviewIdx];
//     if (!selectedPreview) return;

//     const workspace = Blockly.getMainWorkspace();
//     // This is mostly copied from https://github.com/scratchfoundation/scratch-blocks/blob/893c7e7ad5bfb416eaed75d9a1c93bdce84e36ab/core/scratch_blocks_utils.js#L171
//     // Some bits were removed or changed to fit our needs.
//     workspace.setResizesEnabled(false);

//     let newBlock;
//     Blockly.Events.disable();
//     try {
//       newBlock = selectedPreview.block.createWorkspaceForm();
//       Blockly.scratchBlocksUtils.changeObscuredShadowIds(newBlock);

//       var svgRootNew = newBlock.getSvgRoot();
//       if (!svgRootNew) {
//         throw new Error("newBlock is not rendered.");
//       }

//       let blockBounds = newBlock.svgPath_.getBoundingClientRect();
//       let newBlockX = Math.floor((mousePosition.x - (blockBounds.left + blockBounds.right) / 2) / workspace.scale);
//       let newBlockY = Math.floor((mousePosition.y - (blockBounds.top + blockBounds.bottom) / 2) / workspace.scale);
//       newBlock.moveBy(newBlockX, newBlockY);
//     } finally {
//       Blockly.Events.enable();
//     }
//     if (Blockly.Events.isEnabled()) {
//       Blockly.Events.fire(new Blockly.Events.BlockCreate(newBlock));
//     }

//     let fakeEvent = {
//       clientX: mousePosition.x,
//       clientY: mousePosition.y,
//       type: "mousedown",
//       stopPropagation: function () {},
//       preventDefault: function () {},
//       target: selectedPreview.svgBlock,
//     };
//     if (workspace.getGesture(fakeEvent)) {
//       workspace.startDragWithFakeEvent(fakeEvent, newBlock);
//     }
//   }

//   function acceptAutocomplete() {
//     let factory;
//     if (queryPreviews[selectedPreviewIdx]) factory = queryPreviews[selectedPreviewIdx].autocompleteFactory;
//     else factory = () => popupInputSuggestion.value;
//     if (popupInputSuggestion.value.length === 0 || !factory) return;
//     popupInput.value = factory(false);
//     // Move cursor to the end of the newly inserted text
//     popupInput.selectionStart = popupInput.value.length + 1;
//     updateInput();
//   }

//   popupInput.addEventListener("keydown", (e) => {
//     switch (e.key) {
//       case "Escape":
//         // If there's something in the input, clear it
//         if (popupInput.value.length > 0) {
//           popupInput.value = "";
//           updateInput();
//         } else {
//           // If not, close the menu
//           closePopup();
//         }
//         e.stopPropagation();
//         e.preventDefault();
//         break;
//       case "Tab":
//         acceptAutocomplete();
//         e.stopPropagation();
//         e.preventDefault();
//         break;
//       case "Enter":
//         selectBlock();
//         closePopup();
//         e.stopPropagation();
//         e.preventDefault();
//         break;
//       case "ArrowDown":
//         if (selectedPreviewIdx + 1 >= queryPreviews.length) updateSelection(0);
//         else updateSelection(selectedPreviewIdx + 1);
//         e.stopPropagation();
//         e.preventDefault();
//         break;
//       case "ArrowUp":
//         if (selectedPreviewIdx - 1 < 0) updateSelection(queryPreviews.length - 1);
//         else updateSelection(selectedPreviewIdx - 1);
//         e.stopPropagation();
//         e.preventDefault();
//         break;
//     }
//   });

//   popupInput.addEventListener("focusout", closePopup);

//   // Open on ctrl + space
//   document.addEventListener("keydown", (e) => {
//     if (e.key === " " && (e.ctrlKey || e.metaKey)) {
//       openPopup();
//       e.preventDefault();
//       e.stopPropagation();
//     }
//   });

//   // Open on mouse wheel button
//   const _doWorkspaceClick_ = Blockly.Gesture.prototype.doWorkspaceClick_;
//   Blockly.Gesture.prototype.doWorkspaceClick_ = function () {
//     if (this.mostRecentEvent_.button === 1 || this.mostRecentEvent_.shiftKey) openPopup();
//     mousePosition = { x: this.mostRecentEvent_.clientX, y: this.mostRecentEvent_.clientY };
//     _doWorkspaceClick_.call(this);
//   };

//   // The popup should delete blocks dragged ontop of it
//   const _isDeleteArea = Blockly.WorkspaceSvg.prototype.isDeleteArea;
//   Blockly.WorkspaceSvg.prototype.isDeleteArea = function (e) {
//     if (popupPosition) {
//       if (
//         e.clientX > popupPosition.x &&
//         e.clientX < popupPosition.x + previewWidth &&
//         e.clientY > popupPosition.y &&
//         e.clientY < popupPosition.y + previewHeight
//       ) {
//         return Blockly.DELETE_AREA_TOOLBOX;
//       }
//     }
//     return _isDeleteArea.call(this, e);
//   };
// }

export default async function ({ addon, msg, console }) {
  const Blockly = await addon.tab.traps.getBlockly();

  class MiddleClickPopup {
    constructor(workspace) {
      this.containerVisible_ = true;
      this.isVisible_ = true;
      this.DEFAULT_WIDTH = 200;
      this.CORNER_RADIUS = 0;
      this.SCROLLBAR_PADDING = 2;
      this.MARGIN = 12;
      this.GAP_X = Blockly.Flyout.prototype.MARGIN * 3;
      this.GAP_Y = Blockly.Flyout.prototype.MARGIN;
      const workspaceOptions = {
        disabledPatternId: workspace.options.disabledPatternId,
        parentWorkspace: workspace,
        RTL: workspace.RTL,
        oneBasedIndex: workspace.options.oneBasedIndex,
        horizontalLayout: workspace.horizontalLayout,
        toolboxPosition: workspace.options.toolboxPosition,
        stackGlowFilterId: workspace.options.stackGlowFilterId,
        getMetrics: this.getMetrics_.bind(this),
        setMetrics: this.setMetrics_.bind(this),
      };
      this.workspace_ = new Blockly.WorkspaceSvg(workspaceOptions);
      this.workspace_.isMiddleClickPopup = true;

      this.RTL = !!workspaceOptions.RTL;
      this.horizontalLayout_ = workspaceOptions.horizontalLayout;
      this.eventWrappers_ = [];
      this.recycleBlocks_ = [];
      this.permanentlyDisabled_ = [];
      this.backgroundButtons_ = [];
      this.listeners_ = [];
      this.buttons_ = [];

      this.createDom();
      this.init(workspace);
      this.show(
        Blockly.Options.parseToolboxTree(`
      <xml style="display: none">
        <block type="motion_movesteps">
            <value name="STEPS">
                <shadow type="math_number">
                    <field name="NUM">10</field>
                </shadow>
            </value>
        </block>
        <block type="motion_turnright">
            <value name="DEGREES">
                <shadow type="math_number">
                    <field name="NUM">15</field>
                </shadow>
            </value>
        </block>
        <block type="motion_turnleft">
            <value name="DEGREES">
                <shadow type="math_number">
                    <field name="NUM">15</field>
                </shadow>
            </value>
        </block>
        <block type="motion_goto">
            <value name="TO">
                <shadow type="motion_goto_menu">
                </shadow>
            </value>
        </block>
        <block type="motion_gotoxy">
            <value name="X">
                <shadow id="movex" type="math_number">
                    <field name="NUM">0</field>
                </shadow>
            </value>
            <value name="Y">
                <shadow id="movey" type="math_number">
                    <field name="NUM">0</field>
                </shadow>
            </value>
        </block>
      </xml>`).children
      );
    }

    init(targetWorkspace) {
      this.targetWorkspace_ = targetWorkspace;
      this.workspace_.targetWorkspace = targetWorkspace;

      this.scrollbar_ = new Blockly.Scrollbar(this.workspace_, false, false, "blocklyFlyoutScrollbar");

      this.position();

      Array.prototype.push.apply(
        this.eventWrappers_,
        Blockly.bindEventWithChecks_(this.svgGroup_, "wheel", this, this.wheel_)
      );
      // Dragging the flyout up and down (or left and right).
      Array.prototype.push.apply(
        this.eventWrappers_,
        Blockly.bindEventWithChecks_(this.svgGroup_, "mousedown", this, this.onMouseDown_)
      );

      this.workspace_.getGesture = this.targetWorkspace_.getGesture.bind(this.targetWorkspace_);

      // Get variables from the main workspace rather than the target workspace.
      this.workspace_.variableMap_ = this.targetWorkspace_.getVariableMap();

      this.workspace_.createPotentialVariableMap();

      this.workspace_.scale = targetWorkspace.scale;
    }

    createDom() {
      this.container_ = document.createElement("div");
      this.container_.style.position = "fixed";
      this.container_.style.top = "300px";
      this.container_.style.left = "300px";
      this.container_.style.zIndex = "9999";
      this.svgGroup_ = Blockly.utils.createSvgElement("svg", { class: "middle-click-dropdown" }, this.container_);
      this.svgBackground_ = Blockly.utils.createSvgElement(
        "path",
        { class: "blocklyFlyoutBackground" },
        this.svgGroup_
      );
      this.svgGroup_.appendChild(this.workspace_.createDom());
      document.body.append(this.container_);

      const styles = document.createElement("style");
      styles.textContent = `
      .middle-click-dropdown {
        position: absolute;
        border: 1px solid #383838;
        border-radius: 5px;
      }`;
      document.body.append(styles);

      this.defs_ = Blockly.utils.createSvgElement("defs", {}, this.svgGroup_);
      var clipPath = Blockly.utils.createSvgElement("clipPath", { id: "blocklyBlockMenuClipPath" }, this.defs_);
      this.clipRect_ = Blockly.utils.createSvgElement(
        "rect",
        {
          id: "blocklyBlockMenuClipRect",
          height: "0",
          width: "0",
          y: "0",
          x: "0",
        },
        clipPath
      );
      this.workspace_.svgGroup_.setAttribute("clip-path", "url(#blocklyBlockMenuClipPath)");
    }

    position() {
      if (!this.isVisible()) {
        return;
      }

      this.width_ = this.getWidth();
      this.height_ = this.getHeight();

      this.setBackgroundPath_(this.width_, this.height_);

      this.svgGroup_.setAttribute("width", this.width_);
      this.svgGroup_.setAttribute("height", this.height_);

      if (this.scrollbar_) {
        // Set the scrollbars origin to be the top left of the flyout.
        this.scrollbar_.setOrigin(0, 0);
        this.scrollbar_.resize();
      }
      this.svgGroup_.style.opacity = 1;
    }

    setBackgroundPath_(width, height) {
      var path = ["M " + 0 + ",0"];
      // Top.
      path.push("h", width);
      // Rounded corner.
      path.push("a", this.CORNER_RADIUS, this.CORNER_RADIUS, 0, 0, 1, this.CORNER_RADIUS, this.CORNER_RADIUS);
      // Side closest to workspace.
      path.push("v", Math.max(0, height - this.CORNER_RADIUS * 2));
      // Rounded corner.
      path.push("a", this.CORNER_RADIUS, this.CORNER_RADIUS, 0, 0, 1, -this.CORNER_RADIUS, this.CORNER_RADIUS);
      // Bottom.
      path.push("h", -width);
      path.push("z");
      this.svgBackground_.setAttribute("d", path.join(" "));
    }

    isDragTowardWorkspace(currentDragDeltaXY) {
      return true;
    }

    isVisible() {
      return this.isVisible_;
    }

    setVisible(visible) {
      var visibilityChanged = visible != this.isVisible();

      this.isVisible_ = visible;
      if (visibilityChanged) {
        this.updateDisplay_();
      }
    }

    updateDisplay_() {
      var show = true;
      if (!this.containerVisible_) {
        show = false;
      } else {
        show = this.isVisible();
      }
      this.svgGroup_.style.display = show ? "block" : "none";
      // Update the scrollbar's visiblity too since it should mimic the
      // flyout's visibility.
      this.scrollbar_.setContainerVisible(show);
    }

    setContainerVisible(visible) {
      var visibilityChanged = visible != this.containerVisible_;
      this.containerVisible_ = visible;
      if (visibilityChanged) {
        this.updateDisplay_();
      }
    }

    setScrollPos(pos) {
      this.scrollbar_.set(pos * this.workspace_.scale);
    }

    setRecyclingEnabled(recycle) {
      this.recyclingEnabled_ = recycle;
    }

    isScrollable() {
      return this.scrollbar_ ? this.scrollbar_.isVisible() : false;
    }

    getWidth() {
      return this.DEFAULT_WIDTH;
    }

    getHeight() {
      return this.DEFAULT_WIDTH;
    }

    getMetrics_() {
      if (!this.isVisible()) {
        // Flyout is hidden.
        return null;
      }
      var optionBox = this.getContentBoundingBox_();
      var absoluteTop = this.SCROLLBAR_PADDING;
      var absoluteLeft = 0;
      var viewHeight = this.height_ - 2 * this.SCROLLBAR_PADDING;
      var viewWidth = this.getWidth() - this.SCROLLBAR_PADDING;
      var contentHeight = optionBox.height * this.workspace_.scale;
      this.recordCategoryScrollPositions_();
      var bottomPadding = this.MARGIN;
      // if (this.categoryScrollPositions.length > 0) {
      //   var lastLabel = this.categoryScrollPositions[
      //       this.categoryScrollPositions.length - 1];
      //   var lastPos = lastLabel.position * this.workspace_.scale;
      //   var lastCategoryHeight = contentHeight - lastPos;
      //   if (lastCategoryHeight < viewHeight) {
      //     bottomPadding = viewHeight - lastCategoryHeight;
      //   }
      // }

      var metrics = {
        viewHeight: viewHeight,
        viewWidth: viewWidth,
        contentHeight: contentHeight + bottomPadding,
        contentWidth: optionBox.width * this.workspace_.scale + 2 * this.MARGIN,
        viewTop: -this.workspace_.scrollY + optionBox.y,
        viewLeft: -this.workspace_.scrollX,
        contentTop: optionBox.y,
        contentLeft: optionBox.x,
        absoluteTop: absoluteTop,
        absoluteLeft: absoluteLeft,
      };
      return metrics;
    }

    setMetrics_(xyRatio) {
      var metrics = this.getMetrics_();
      // This is a fix to an apparent race condition.
      if (!metrics) {
        return;
      }
      if (Number.isInteger(xyRatio.y)) {
        this.workspace_.scrollY = -metrics.contentHeight * xyRatio.y;
      }
      this.workspace_.translate(
        this.workspace_.scrollX + metrics.absoluteLeft,
        this.workspace_.scrollY + metrics.absoluteTop
      );

      this.clipRect_.setAttribute("height", Math.max(0, metrics.viewHeight) + "px");
      this.clipRect_.setAttribute("width", metrics.viewWidth + "px");

      // if (this.categoryScrollPositions) {
      //   this.selectCategoryByScrollPosition(-this.workspace_.scrollY);
      // }
    }

    getContentBoundingBox_() {
      var contentBounds = this.workspace_.getBlocksBoundingBox();
      var bounds = {
        xMin: contentBounds.x,
        yMin: contentBounds.y,
        xMax: contentBounds.x + contentBounds.width,
        yMax: contentBounds.y + contentBounds.height,
      };

      // Check if any of the buttons/labels are outside the blocks bounding box.
      for (var i = 0; i < this.buttons_.length; i++) {
        var button = this.buttons_[i];
        var buttonPosition = button.getPosition();
        if (buttonPosition.x < bounds.xMin) {
          bounds.xMin = buttonPosition.x;
        }
        if (buttonPosition.y < bounds.yMin) {
          bounds.yMin = buttonPosition.y;
        }
        // Button extends past the bounding box to the right.
        if (buttonPosition.x + button.width > bounds.xMax) {
          bounds.xMax = buttonPosition.x + button.width;
        }

        // Button extends past the bounding box on the bottom
        if (buttonPosition.y + button.height > bounds.yMax) {
          bounds.yMax = buttonPosition.y + button.height;
        }
      }

      return {
        x: bounds.xMin,
        y: bounds.yMin,
        width: bounds.xMax - bounds.xMin,
        height: bounds.yMax - bounds.yMin,
      };
    }

    recordCategoryScrollPositions_() {}

    scrollToStart() {
      this.scrollbar_.set(0);
    }

    hide() {
      if (!this.isVisible()) {
        return;
      }
      this.setVisible(false);
      // Delete all the event listeners.
      for (var x = 0, listen; (listen = this.listeners_[x]); x++) {
        Blockly.unbindEvent_(listen);
      }
      this.listeners_.length = 0;
      if (this.reflowWrapper_) {
        this.workspace_.removeChangeListener(this.reflowWrapper_);
        this.reflowWrapper_ = null;
      }
    }

    show(xmlList) {
      this.workspace_.setResizesEnabled(false);
      this.hide();
      this.clearOldBlocks_();

      this.setVisible(true);
      // Create the blocks to be shown in this flyout.
      var contents = [];
      var gaps = [];
      this.permanentlyDisabled_.length = 0;
      for (var i = 0, xml; (xml = xmlList[i]); i++) {
        // Handle dynamic categories, represented by a name instead of a list of XML.
        // Look up the correct category generation function and call that to get a
        // valid XML list.
        // if (typeof xml === "string") {
        //   var fnToApply = this.workspace_.targetWorkspace.getToolboxCategoryCallback(xmlList[i]);
        //   var newList = fnToApply(this.workspace_.targetWorkspace);
        //   // Insert the new list of blocks in the middle of the list.
        //   // We use splice to insert at index i, and remove a single element
        //   // (the placeholder string). Because the spread operator (...) is not
        //   // available, use apply and concat the array.
        //   xmlList.splice.apply(xmlList, [i, 1].concat(newList));
        //   xml = xmlList[i];
        // }
        if (xml.tagName) {
          var tagName = xml.tagName.toUpperCase();
          var default_gap = this.horizontalLayout_ ? this.GAP_X : this.GAP_Y;
          if (tagName == "BLOCK") {
            // We assume that in a flyout, the same block id (or type if missing id) means
            // the same output BlockSVG.

            // Look for a block that matches the id or type, our createBlock will assign
            // id = type if none existed.
            var id = xml.getAttribute("id") || xml.getAttribute("type");
            var recycled = this.recycleBlocks_.findIndex(function (block) {
              return block.id === id;
            });

            // If we found a recycled item, reuse the BlockSVG from last time.
            // Otherwise, convert the XML block to a BlockSVG.
            var curBlock;
            if (recycled > -1) {
              curBlock = this.recycleBlocks_.splice(recycled, 1)[0];
            } else {
              curBlock = Blockly.Xml.domToBlock(xml, this.workspace_);
            }

            if (curBlock.disabled) {
              // Record blocks that were initially disabled.
              // Do not enable these blocks as a result of capacity filtering.
              this.permanentlyDisabled_.push(curBlock);
            }
            contents.push({ type: "block", block: curBlock });
            var gap = parseInt(xml.getAttribute("gap"), 10);
            gaps.push(isNaN(gap) ? default_gap : gap);
          } else if (xml.tagName.toUpperCase() == "SEP") {
            // Change the gap between two blocks.
            // <sep gap="36"></sep>
            // The default gap is 24, can be set larger or smaller.
            // This overwrites the gap attribute on the previous block.
            // Note that a deprecated method is to add a gap to a block.
            // <block type="math_arithmetic" gap="8"></block>
            var newGap = parseInt(xml.getAttribute("gap"), 10);
            // Ignore gaps before the first block.
            if (!isNaN(newGap) && gaps.length > 0) {
              gaps[gaps.length - 1] = newGap;
            } else {
              gaps.push(default_gap);
            }
          } else if (tagName == "LABEL" && xml.getAttribute("showStatusButton") == "true") {
            var curButton = new Blockly.FlyoutExtensionCategoryHeader(this.workspace_, this.targetWorkspace_, xml);
            contents.push({ type: "button", button: curButton });
            gaps.push(default_gap);
          } else if (tagName == "BUTTON" || tagName == "LABEL") {
            // Labels behave the same as buttons, but are styled differently.
            var isLabel = tagName == "LABEL";
            var curButton = new Blockly.FlyoutButton(this.workspace_, this.targetWorkspace_, xml, isLabel);
            contents.push({ type: "button", button: curButton });
            gaps.push(default_gap);
          }
        }
      }

      this.emptyRecycleBlocks_();

      this.layout_(contents, gaps);

      // IE 11 is an incompetent browser that fails to fire mouseout events.
      // When the mouse is over the background, deselect all blocks.
      var deselectAll = function () {
        var topBlocks = this.workspace_.getTopBlocks(false);
        for (var i = 0, block; (block = topBlocks[i]); i++) {
          block.removeSelect();
        }
      };

      this.listeners_.push(Blockly.bindEvent_(this.svgBackground_, "mouseover", this, deselectAll));

      this.workspace_.setResizesEnabled(true);
      this.reflow();

      // Correctly position the flyout's scrollbar when it opens.
      this.position();

      this.reflowWrapper_ = this.reflow.bind(this);
      this.workspace_.addChangeListener(this.reflowWrapper_);

      this.recordCategoryScrollPositions_();
    }

    emptyRecycleBlocks_() {
      // Clean out the old recycle bin.
      var oldBlocks = this.recycleBlocks_;
      this.recycleBlocks_ = [];
      for (var i = 0; i < oldBlocks.length; i++) {
        oldBlocks[i].dispose(false, false);
      }
    }

    layout_(contents, gaps) {
      var margin = this.MARGIN;
      var flyoutWidth = this.getWidth() / this.workspace_.scale;
      var cursorX = margin;
      var cursorY = margin;

      for (var i = 0, item; (item = contents[i]); i++) {
        if (item.type == "block") {
          var block = item.block;
          var allBlocks = block.getDescendants(false);
          for (var j = 0, child; (child = allBlocks[j]); j++) {
            // Mark blocks as being inside a flyout.  This is used to detect and
            // prevent the closure of the flyout if the user right-clicks on such a
            // block.
            child.isInFlyout = true;
          }
          var root = block.getSvgRoot();
          var blockHW = block.getHeightWidth();

          // Figure out where the block goes, taking into account its size, whether
          // we're in RTL mode, and whether it has a checkbox.
          var oldX = block.getRelativeToSurfaceXY().x;
          var newX = flyoutWidth - this.MARGIN;

          var moveX = this.RTL ? newX - oldX : margin;

          // The block moves a bit extra for the hat, but the block's rectangle
          // doesn't.  That's because the hat actually extends up from 0.
          block.moveBy(moveX, cursorY + (block.startHat_ ? Blockly.BlockSvg.START_HAT_HEIGHT : 0));

          var rect = this.createRect_(block, this.RTL ? moveX - blockHW.width : moveX, cursorY, blockHW, i);

          this.addBlockListeners_(root, block, rect);

          cursorY += blockHW.height + gaps[i] + (block.startHat_ ? Blockly.BlockSvg.START_HAT_HEIGHT : 0);
        } else if (item.type == "button") {
          var button = item.button;
          var buttonSvg = button.createDom();
          if (this.RTL) {
            button.moveTo(flyoutWidth - this.MARGIN - button.width, cursorY);
          } else {
            button.moveTo(cursorX, cursorY);
          }
          button.show();
          // Clicking on a flyout button or label is a lot like clicking on the
          // flyout background.
          this.listeners_.push(Blockly.bindEventWithChecks_(buttonSvg, "mousedown", this, this.onMouseDown_));

          this.buttons_.push(button);
          cursorY += button.height + gaps[i];
        }
      }
    }

    createRect_(block, x, y, blockHW, index) {
      // Create an invisible rectangle under the block to act as a button.  Just
      // using the block as a button is poor, since blocks have holes in them.
      var rect = Blockly.utils.createSvgElement(
        "rect",
        {
          "fill-opacity": 0,
          x: x,
          y: y,
          height: blockHW.height,
          width: blockHW.width,
        },
        null
      );
      rect.tooltip = block;
      Blockly.Tooltip.bindMouseEvents(rect);
      // Add the rectangles under the blocks, so that the blocks' tooltips work.
      this.workspace_.getCanvas().insertBefore(rect, block.getSvgRoot());

      block.flyoutRect_ = rect;
      this.backgroundButtons_[index] = rect;
      return rect;
    }

    addBlockListeners_(root, block, rect) {
      this.listeners_.push(Blockly.bindEventWithChecks_(root, "mousedown", null, this.blockMouseDown_(block)));
      this.listeners_.push(Blockly.bindEventWithChecks_(rect, "mousedown", null, this.blockMouseDown_(block)));
      this.listeners_.push(Blockly.bindEvent_(root, "mouseover", block, block.addSelect));
      this.listeners_.push(Blockly.bindEvent_(root, "mouseout", block, block.removeSelect));
      this.listeners_.push(Blockly.bindEvent_(rect, "mouseover", block, block.addSelect));
      this.listeners_.push(Blockly.bindEvent_(rect, "mouseout", block, block.removeSelect));
    }

    blockMouseDown_(block) {
      var flyout = this;
      return function (e) {
        var gesture = flyout.targetWorkspace_.getGesture(e);
        if (gesture) {
          gesture.setStartBlock(block);
          gesture.handleFlyoutStart(e, flyout);
        }
      };
    }

    clearOldBlocks_() {
      // Delete any blocks from a previous showing.
      var oldBlocks = this.workspace_.getTopBlocks(false);
      for (var i = 0, block; (block = oldBlocks[i]); i++) {
        if (block.workspace == this.workspace_) {
          block.dispose(false, false);
        }
      }
      // Delete any background buttons from a previous showing.
      for (var j = 0; j < this.backgroundButtons_.length; j++) {
        var rect = this.backgroundButtons_[j];
        if (rect) rect.remove();
      }
      this.backgroundButtons_.length = 0;

      for (var i = 0, button; (button = this.buttons_[i]); i++) {
        button.dispose();
      }
      this.buttons_.length = 0;

      // Clear potential variables from the previous showing.
      this.workspace_.getPotentialVariableMap().clear();
    }

    reflow() {
      if (this.reflowWrapper_) {
        this.workspace_.removeChangeListener(this.reflowWrapper_);
      }
      var blocks = this.workspace_.getTopBlocks(false);
      // this.reflowInternal_(blocks);
      if (this.reflowWrapper_) {
        this.workspace_.addChangeListener(this.reflowWrapper_);
      }
    }

    dispose() {
      this.hide();
      Blockly.unbindEvent_(this.eventWrappers_);
      if (this.scrollbar_) {
        this.scrollbar_.dispose();
        this.scrollbar_ = null;
      }
      if (this.workspace_) {
        this.workspace_.targetWorkspace = null;
        this.workspace_.dispose();
        this.workspace_ = null;
      }
      if (this.svgGroup_) {
        this.svgGroup_.remove();
        this.svgGroup_ = null;
      }
      this.parentToolbox_ = null;
      this.svgBackground_ = null;
      this.targetWorkspace_ = null;
    }

    getWorkspace() {
      return this.workspace_;
    }

    createBlock(originalBlock) {
      var newBlock = null;
      Blockly.Events.disable();
      var variablesBeforeCreation = this.targetWorkspace_.getAllVariables();
      this.targetWorkspace_.setResizesEnabled(false);
      try {
        newBlock = this.placeNewBlock_(originalBlock);
        // Close the flyout.
        Blockly.hideChaff();
      } finally {
        Blockly.Events.enable();
      }

      var newVariables = Blockly.Variables.getAddedVariables(this.targetWorkspace_, variablesBeforeCreation);

      if (Blockly.Events.isEnabled()) {
        Blockly.Events.setGroup(true);
        Blockly.Events.fire(new Blockly.Events.Create(newBlock));
        // Fire a VarCreate event for each (if any) new variable created.
        for (var i = 0; i < newVariables.length; i++) {
          var thisVariable = newVariables[i];
          Blockly.Events.fire(new Blockly.Events.VarCreate(thisVariable));
        }
      }
      if (this.autoClose) {
        this.hide();
      }
      return newBlock;
    }

    recycleBlock_(block) {
      var xy = block.getRelativeToSurfaceXY();
      block.moveBy(-xy.x, -xy.y);
      this.recycleBlocks_.push(block);
    }

    placeNewBlock_(oldBlock) {
      var targetWorkspace = this.targetWorkspace_;
      var svgRootOld = oldBlock.getSvgRoot();
      if (!svgRootOld) {
        throw "oldBlock is not rendered.";
      }

      // Create the new block by cloning the block in the flyout (via XML).
      var xml = Blockly.Xml.blockToDom(oldBlock);
      // The target workspace would normally resize during domToBlock, which will
      // lead to weird jumps.  Save it for terminateDrag.
      targetWorkspace.setResizesEnabled(false);

      // Using domToBlock instead of domToWorkspace means that the new block will be
      // placed at position (0, 0) in main workspace units.
      var block = Blockly.Xml.domToBlock(xml, targetWorkspace);
      var svgRootNew = block.getSvgRoot();
      if (!svgRootNew) {
        throw "block is not rendered.";
      }

      // The offset in pixels between the main workspace's origin and the upper left
      // corner of the injection div.
      var mainOffsetPixels = targetWorkspace.getOriginOffsetInPixels();

      // The offset in pixels between the flyout workspace's origin and the upper
      // left corner of the injection div.
      // TODO: Why does it error?
      console.log(this.workspace_, this.workspace_.svgBlockCanvas_.getAttribute);
      var flyoutOffsetPixels = this.workspace_.getOriginOffsetInPixels();

      // The position of the old block in flyout workspace coordinates.
      var oldBlockPosWs = oldBlock.getRelativeToSurfaceXY();

      // The position of the old block in pixels relative to the flyout
      // workspace's origin.
      var oldBlockPosPixels = oldBlockPosWs.scale(this.workspace_.scale);

      // The position of the old block in pixels relative to the upper left corner
      // of the injection div.
      var oldBlockOffsetPixels = {
        x: flyoutOffsetPixels.x + oldBlockPosPixels.x,
        y: flyoutOffsetPixels.y + oldBlockPosPixels.y,
      };

      // The position of the old block in pixels relative to the origin of the
      // main workspace.
      var finalOffsetPixels = {
        x: oldBlockOffsetPixels.x - mainOffsetPixels.x,
        y: oldBlockOffsetPixels.y - mainOffsetPixels.y,
      };

      // The position of the old block in main workspace coordinates.
      var finalOffsetMainWs = finalOffsetPixels.scale(1 / targetWorkspace.scale);

      block.moveBy(finalOffsetMainWs.x, finalOffsetMainWs.y);
      return block;
    }

    wheel_(e) {
      // remove scrollTarget to stop auto scrolling in stepScrollAnimation
      this.scrollTarget = null;

      var delta = e.deltaY;

      if (delta) {
        // Firefox's mouse wheel deltas are a tenth that of Chrome/Safari.
        // DeltaMode is 1 for a mouse wheel, but not for a trackpad scroll event
        // TODO
        // if (goog.userAgent.GECKO && (e.deltaMode === 1)) {
        //   delta *= 10;
        // }
        var metrics = this.getMetrics_();
        var pos = metrics.viewTop - metrics.contentTop + delta;
        var limit = metrics.contentHeight - metrics.viewHeight;
        pos = Math.min(pos, limit);
        pos = Math.max(pos, 0);
        this.scrollbar_.set(pos);
        // When the flyout moves from a wheel event, hide WidgetDiv and DropDownDiv.
        Blockly.WidgetDiv.hide(true);
        Blockly.DropDownDiv.hideWithoutAnimation();
      }

      // Don't scroll the page.
      e.preventDefault();
      // Don't propagate mousewheel event (zooming).
      e.stopPropagation();
    }

    onMouseDown_(e) {
      var gesture = this.targetWorkspace_.getGesture(e);
      if (gesture) {
        gesture.handleFlyoutStart(e, this);
      }
    }

    stepScrollAnimation() {
      if (!this.scrollTarget) {
        return;
      }
      var scrollPos = this.horizontalLayout_ ? -this.workspace_.scrollX : -this.workspace_.scrollY;
      var diff = this.scrollTarget - scrollPos;
      if (Math.abs(diff) < 1) {
        this.scrollbar_.set(this.scrollTarget);
        this.scrollTarget = null;
        return;
      }
      this.scrollbar_.set(scrollPos + diff * this.scrollAnimationFraction);

      // Polyfilled by goog.dom.animationFrame.polyfill
      requestAnimationFrame(this.stepScrollAnimation.bind(this));
    }

    getScrollPos() {
      var pos = this.horizontalLayout_ ? -this.workspace_.scrollX : -this.workspace_.scrollY;
      return pos / this.workspace_.scale;
    }
  }

  const workspace = Blockly.getMainWorkspace();
  new MiddleClickPopup(workspace);
}
