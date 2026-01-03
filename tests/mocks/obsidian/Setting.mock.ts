import { vi } from "vitest";

export class MockSetting {
  settingEl: HTMLElement;
  infoEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  controlEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement("div");
    this.settingEl.classList.add("setting-item");
    this.infoEl = document.createElement("div");
    this.infoEl.classList.add("setting-item-info");
    this.nameEl = document.createElement("div");
    this.nameEl.classList.add("setting-item-name");
    this.descEl = document.createElement("div");
    this.descEl.classList.add("setting-item-description");
    this.controlEl = document.createElement("div");
    this.controlEl.classList.add("setting-item-control");

    this.infoEl.appendChild(this.nameEl);
    this.infoEl.appendChild(this.descEl);
    this.settingEl.appendChild(this.infoEl);
    this.settingEl.appendChild(this.controlEl);
    containerEl.appendChild(this.settingEl);
  }

  setName(name: string): this {
    this.nameEl.textContent = name;
    return this;
  }

  setDesc(desc: string): this {
    this.descEl.textContent = desc;
    return this;
  }

  setClass(cls: string): this {
    this.settingEl.classList.add(cls);
    return this;
  }

  setHeading(): this {
    this.settingEl.classList.add("setting-item-heading");
    return this;
  }

  setDisabled(disabled: boolean): this {
    if (disabled) {
      this.settingEl.classList.add("is-disabled");
    } else {
      this.settingEl.classList.remove("is-disabled");
    }
    return this;
  }

  addText(cb: (text: MockTextComponent) => void): this {
    const text = new MockTextComponent(this.controlEl);
    cb(text);
    return this;
  }

  addTextArea(cb: (text: MockTextAreaComponent) => void): this {
    const text = new MockTextAreaComponent(this.controlEl);
    cb(text);
    return this;
  }

  addToggle(cb: (toggle: MockToggleComponent) => void): this {
    const toggle = new MockToggleComponent(this.controlEl);
    cb(toggle);
    return this;
  }

  addDropdown(cb: (dropdown: MockDropdownComponent) => void): this {
    const dropdown = new MockDropdownComponent(this.controlEl);
    cb(dropdown);
    return this;
  }

  addButton(cb: (button: MockButtonComponent) => void): this {
    const button = new MockButtonComponent(this.controlEl);
    cb(button);
    return this;
  }

  addSlider(cb: (slider: MockSliderComponent) => void): this {
    const slider = new MockSliderComponent(this.controlEl);
    cb(slider);
    return this;
  }
}

class MockTextComponent {
  inputEl: HTMLInputElement;
  private value = "";
  private changeCallback?: (value: string) => void;

  constructor(containerEl: HTMLElement) {
    this.inputEl = document.createElement("input");
    this.inputEl.type = "text";
    containerEl.appendChild(this.inputEl);
  }

  setValue(value: string): this {
    this.value = value;
    this.inputEl.value = value;
    return this;
  }

  getValue(): string {
    return this.value;
  }

  setPlaceholder(placeholder: string): this {
    this.inputEl.placeholder = placeholder;
    return this;
  }

  onChange(cb: (value: string) => void): this {
    this.changeCallback = cb;
    this.inputEl.addEventListener("change", () => {
      this.value = this.inputEl.value;
      cb(this.inputEl.value);
    });
    return this;
  }
}

class MockTextAreaComponent {
  inputEl: HTMLTextAreaElement;
  private value = "";

  constructor(containerEl: HTMLElement) {
    this.inputEl = document.createElement("textarea");
    containerEl.appendChild(this.inputEl);
  }

  setValue(value: string): this {
    this.value = value;
    this.inputEl.value = value;
    return this;
  }

  getValue(): string {
    return this.value;
  }

  setPlaceholder(placeholder: string): this {
    this.inputEl.placeholder = placeholder;
    return this;
  }

  onChange(cb: (value: string) => void): this {
    this.inputEl.addEventListener("change", () => {
      this.value = this.inputEl.value;
      cb(this.inputEl.value);
    });
    return this;
  }
}

class MockToggleComponent {
  toggleEl: HTMLElement;
  private value = false;

  constructor(containerEl: HTMLElement) {
    this.toggleEl = document.createElement("div");
    this.toggleEl.classList.add("checkbox-container");
    containerEl.appendChild(this.toggleEl);
  }

  setValue(value: boolean): this {
    this.value = value;
    if (value) {
      this.toggleEl.classList.add("is-enabled");
    } else {
      this.toggleEl.classList.remove("is-enabled");
    }
    return this;
  }

  getValue(): boolean {
    return this.value;
  }

  onChange(cb: (value: boolean) => void): this {
    this.toggleEl.addEventListener("click", () => {
      this.value = !this.value;
      this.setValue(this.value);
      cb(this.value);
    });
    return this;
  }
}

class MockDropdownComponent {
  selectEl: HTMLSelectElement;
  private value = "";

  constructor(containerEl: HTMLElement) {
    this.selectEl = document.createElement("select");
    containerEl.appendChild(this.selectEl);
  }

  addOption(value: string, display: string): this {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = display;
    this.selectEl.appendChild(option);
    return this;
  }

  addOptions(options: Record<string, string>): this {
    for (const [value, display] of Object.entries(options)) {
      this.addOption(value, display);
    }
    return this;
  }

  setValue(value: string): this {
    this.value = value;
    this.selectEl.value = value;
    return this;
  }

  getValue(): string {
    return this.value;
  }

  onChange(cb: (value: string) => void): this {
    this.selectEl.addEventListener("change", () => {
      this.value = this.selectEl.value;
      cb(this.selectEl.value);
    });
    return this;
  }
}

class MockButtonComponent {
  buttonEl: HTMLButtonElement;

  constructor(containerEl: HTMLElement) {
    this.buttonEl = document.createElement("button");
    containerEl.appendChild(this.buttonEl);
  }

  setButtonText(text: string): this {
    this.buttonEl.textContent = text;
    return this;
  }

  setCta(): this {
    this.buttonEl.classList.add("mod-cta");
    return this;
  }

  setWarning(): this {
    this.buttonEl.classList.add("mod-warning");
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.buttonEl.disabled = disabled;
    return this;
  }

  onClick(cb: () => void): this {
    this.buttonEl.addEventListener("click", cb);
    return this;
  }
}

class MockSliderComponent {
  sliderEl: HTMLInputElement;
  private value = 0;

  constructor(containerEl: HTMLElement) {
    this.sliderEl = document.createElement("input");
    this.sliderEl.type = "range";
    containerEl.appendChild(this.sliderEl);
  }

  setLimits(min: number, max: number, step: number): this {
    this.sliderEl.min = String(min);
    this.sliderEl.max = String(max);
    this.sliderEl.step = String(step);
    return this;
  }

  setValue(value: number): this {
    this.value = value;
    this.sliderEl.value = String(value);
    return this;
  }

  getValue(): number {
    return this.value;
  }

  setDynamicTooltip(): this {
    return this;
  }

  onChange(cb: (value: number) => void): this {
    this.sliderEl.addEventListener("change", () => {
      this.value = Number(this.sliderEl.value);
      cb(this.value);
    });
    return this;
  }
}

// Export as Setting for compatibility.
export const Setting = MockSetting;
