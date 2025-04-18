// filepath: c:\Users\denar\Vencord\src\plugins\remoteVoiceControl\index.ts
import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher, SelectedChannelStore } from "@webpack/common";
// REMOVE: import { ipcRenderer } from "electron";

const VoiceStateStore = findByPropsLazy("getVoiceStateForChannel");

interface VoiceStatus {
    isMuted: boolean;
    isDeafened: boolean;
}

const Native = VencordNative.pluginHelpers.remoteVoiceControl as PluginNative<typeof import("./native")>;

export default definePlugin({
    name: "remoteVoiceControl",
    description: "Control your voice activity remotely with http requests",
    authors: [Devs.arturm],


    flux: {
        AUDIO_TOGGLE_SELF_MUTE() {
            const currentChannelId = SelectedChannelStore.getVoiceChannelId();
            let status: VoiceStatus = { isMuted: false, isDeafened: false }; // Default status if not in VC

            if (currentChannelId) {
                const voiceState = VoiceStateStore.getVoiceStateForChannel(currentChannelId);
                if (voiceState) {
                    status = {
                        isMuted: voiceState.selfMute ?? false, // Use selfMute state
                        isDeafened: voiceState.selfDeaf ?? false, // Use selfDeaf state
                    };
                }
            }
            Native.setStatus(status);
        },
        AUDIO_TOGGLE_SELF_DEAF() {
            const currentChannelId = SelectedChannelStore.getVoiceChannelId();
            let status: VoiceStatus = { isMuted: false, isDeafened: false }; // Default status if not in VC

            if (currentChannelId) {
                const voiceState = VoiceStateStore.getVoiceStateForChannel(currentChannelId);
                if (voiceState) {
                    status = {
                        isMuted: voiceState.selfMute ?? false, // Use selfMute state
                        isDeafened: voiceState.selfDeaf ?? false, // Use selfDeaf state
                    };
                }
            }
            Native.setStatus(status);
        },
        // Also update when joining/leaving channels
        VOICE_STATE_UPDATES() {
            // Use setTimeout to ensure the stores have updated after joining/leaving
            setTimeout(() => {
                const currentChannelId = SelectedChannelStore.getVoiceChannelId();
                let status: VoiceStatus = { isMuted: false, isDeafened: false }; // Default status if not in VC

                if (currentChannelId) {
                    const voiceState = VoiceStateStore.getVoiceStateForChannel(currentChannelId);
                    if (voiceState) {
                        status = {
                            isMuted: voiceState.selfMute ?? false, // Use selfMute state
                            isDeafened: voiceState.selfDeaf ?? false, // Use selfDeaf state
                        };
                    }
                }
                Native.setStatus(status);
            }, 0);
        }
    },
    // Store the cleanup function returned by the bridge
    removeActionListener: null as (() => void) | null,

    async start() {
        // Use the bridge to set up the listener
        this.removeActionListener = window.remoteVoiceControlBridge.addActionListener(this.handleVoiceAction);

        await Native.startServer();
    },

    stop() {
        // Use the cleanup function provided by the bridge
        if (this.removeActionListener) {
            this.removeActionListener();
            this.removeActionListener = null;
        }
        // Optional: Call Native.stopServer() if you implement it
    },

    handleVoiceAction: (action: string) => { // Type the action explicitly
        switch (action) {
            case "mute":
                FluxDispatcher.dispatch({ type: "AUDIO_TOGGLE_SELF_MUTE" });
                break;
            case "unmute":
                // Check current state if you want distinct mute/unmute, otherwise toggle is fine
                FluxDispatcher.dispatch({ type: "AUDIO_TOGGLE_SELF_MUTE" });
                break;
            case "deafen":
                FluxDispatcher.dispatch({ type: "AUDIO_TOGGLE_SELF_DEAF" });
                break;
            case "undeafen":
                // Check current state if you want distinct deafen/undeafen, otherwise toggle is fine
                FluxDispatcher.dispatch({ type: "AUDIO_TOGGLE_SELF_DEAF" });
                break;
        }
    },

    // These methods are likely redundant now if all control comes via HTTP -> Native -> Renderer
    // You might keep them if you want other plugins to be able to call them directly.
    async mute() {
        FluxDispatcher.dispatch({ type: "AUDIO_TOGGLE_SELF_MUTE" });
    },
    async unmute() {
        FluxDispatcher.dispatch({ type: "AUDIO_TOGGLE_SELF_MUTE" });
    },
    async deafen() {
        FluxDispatcher.dispatch({ type: "AUDIO_TOGGLE_SELF_DEAF" });
    },
    async undeafen() {
        FluxDispatcher.dispatch({ type: "AUDIO_TOGGLE_SELF_DEAF" });
    }
});