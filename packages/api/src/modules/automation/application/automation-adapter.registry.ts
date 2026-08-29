import type { AutomationChannelAdapter } from "../domain/automation.types";

export const AUTOMATION_ADAPTERS = Symbol("AUTOMATION_ADAPTERS");

export class AutomationAdapterRegistry {
    private readonly adapters = new Map<string, AutomationChannelAdapter>();

    constructor(adapters: AutomationChannelAdapter[] = []) {
        adapters.forEach((adapter) => this.register(adapter));
    }

    register(adapter: AutomationChannelAdapter): void { this.adapters.set(adapter.channel, adapter); }
    get(channel: string): AutomationChannelAdapter {
        const adapter = this.adapters.get(channel);
        if (!adapter) throw new Error(`Unsupported automation channel: ${channel}`);
        return adapter;
    }
}
