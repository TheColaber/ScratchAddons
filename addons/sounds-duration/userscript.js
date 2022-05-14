export default async function ({ addon, msg, global, console }) {
  while (true) {
    const container = await addon.tab.waitForElement("[class^=sound-editor_editor-container]", {
      markAsSeen: true,
      reduxCondition: (state) => state.scratchGui.editorTab.activeTabIndex === 2 && !state.scratchGui.mode.isPlayerOnly,
    });
    const el = container.querySelector("[class^=sound-editor_row]").appendChild(
      Object.assign(document.createElement("div"), {
        className: "sa-sound-duration",
      })
    );
    const state = container[addon.tab.traps.getInternalKey(container)].return.return.return.stateNode;

    const norm = (num) => (Math.round(num * 100) / 100).toFixed(2);
    const separator = " / ";

    el.textContent =
      norm(0) + separator + norm(state.audioBufferPlayer.buffer.length / state.audioBufferPlayer.buffer.sampleRate);

    const _handleUpdatePlayhead = state.handleUpdatePlayhead;
    state.handleUpdatePlayhead = function (playhead) {
      _handleUpdatePlayhead.call(this, playhead);
      const timeSinceStart = (Date.now() - this.startTime) / 1000;
      const trimStartTime = state.audioBufferPlayer.buffer.duration * state.audioBufferPlayer.trimStart;
      const trimmedDuration = state.audioBufferPlayer.buffer.duration * state.audioBufferPlayer.trimEnd - trimStartTime;
      el.textContent = norm(timeSinceStart) + separator + norm(trimmedDuration);
    };

    const _handleStoppedPlaying = state.handleStoppedPlaying;
    state.handleStoppedPlaying = function () {
      _handleStoppedPlaying.call(this);
      const trimStartTime = state.audioBufferPlayer.buffer.duration * state.audioBufferPlayer.trimStart;
      const trimmedDuration = state.audioBufferPlayer.buffer.duration * state.audioBufferPlayer.trimEnd - trimStartTime;
      el.textContent = norm(0) + separator + norm(trimmedDuration);
    };

    const _componentWillReceiveProps = state.componentWillReceiveProps;
    state.componentWillReceiveProps = function (newProps) {
      _componentWillReceiveProps.call(this, newProps);
      el.textContent =
        norm(0) + separator + norm(state.audioBufferPlayer.buffer.length / state.audioBufferPlayer.buffer.sampleRate);
    };

    const _handleUpdateTrim = state.handleUpdateTrim;
    state.handleUpdateTrim = function (trimStart, trimEnd) {
      _handleUpdateTrim.call(this, trimStart, trimEnd);
      const trimStartTime = state.audioBufferPlayer.buffer.duration * trimStart;
      const trimmedDuration = state.audioBufferPlayer.buffer.duration * trimEnd - trimStartTime;
      el.textContent = norm(0) + separator + norm(trimmedDuration);
    };
  }
}
