var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};

// @lit-labs/ssr-dom-shim/lib/element-internals.js
var ElementInternalsShim = class ElementInternals {
  get shadowRoot() {
    return this.__host.__shadowRoot;
  }
  constructor(_host) {
    this.ariaActiveDescendantElement = null;
    this.ariaAtomic = "";
    this.ariaAutoComplete = "";
    this.ariaBrailleLabel = "";
    this.ariaBrailleRoleDescription = "";
    this.ariaBusy = "";
    this.ariaChecked = "";
    this.ariaColCount = "";
    this.ariaColIndex = "";
    this.ariaColIndexText = "";
    this.ariaColSpan = "";
    this.ariaControlsElements = null;
    this.ariaCurrent = "";
    this.ariaDescribedByElements = null;
    this.ariaDescription = "";
    this.ariaDetailsElements = null;
    this.ariaDisabled = "";
    this.ariaErrorMessageElements = null;
    this.ariaExpanded = "";
    this.ariaFlowToElements = null;
    this.ariaHasPopup = "";
    this.ariaHidden = "";
    this.ariaInvalid = "";
    this.ariaKeyShortcuts = "";
    this.ariaLabel = "";
    this.ariaLabelledByElements = null;
    this.ariaLevel = "";
    this.ariaLive = "";
    this.ariaModal = "";
    this.ariaMultiLine = "";
    this.ariaMultiSelectable = "";
    this.ariaOrientation = "";
    this.ariaOwnsElements = null;
    this.ariaPlaceholder = "";
    this.ariaPosInSet = "";
    this.ariaPressed = "";
    this.ariaReadOnly = "";
    this.ariaRelevant = "";
    this.ariaRequired = "";
    this.ariaRoleDescription = "";
    this.ariaRowCount = "";
    this.ariaRowIndex = "";
    this.ariaRowIndexText = "";
    this.ariaRowSpan = "";
    this.ariaSelected = "";
    this.ariaSetSize = "";
    this.ariaSort = "";
    this.ariaValueMax = "";
    this.ariaValueMin = "";
    this.ariaValueNow = "";
    this.ariaValueText = "";
    this.role = "";
    this.form = null;
    this.labels = [];
    this.states = /* @__PURE__ */ new Set();
    this.validationMessage = "";
    this.validity = {};
    this.willValidate = true;
    this.__host = _host;
  }
  checkValidity() {
    console.warn("`ElementInternals.checkValidity()` was called on the server.This method always returns true.");
    return true;
  }
  reportValidity() {
    return true;
  }
  setFormValue() {
  }
  setValidity() {
  }
};

// @lit-labs/ssr-dom-shim/lib/events.js
var __classPrivateFieldSet = function(receiver, state, value, kind, f3) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f3) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f3 : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f3.call(receiver, value) : f3 ? f3.value = value : state.set(receiver, value), value;
};
var __classPrivateFieldGet = function(receiver, state, kind, f3) {
  if (kind === "a" && !f3) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f3 : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f3 : kind === "a" ? f3.call(receiver) : f3 ? f3.value : state.get(receiver);
};
var _Event_cancelable;
var _Event_bubbles;
var _Event_composed;
var _Event_defaultPrevented;
var _Event_timestamp;
var _Event_propagationStopped;
var _Event_type;
var _Event_target;
var _Event_isBeingDispatched;
var _a;
var _CustomEvent_detail;
var _b;
var NONE = 0;
var CAPTURING_PHASE = 1;
var AT_TARGET = 2;
var BUBBLING_PHASE = 3;
var enumerableProperty = { __proto__: null };
enumerableProperty.enumerable = true;
Object.freeze(enumerableProperty);
var EventShim = (_a = class Event {
  constructor(type, options = {}) {
    _Event_cancelable.set(this, false);
    _Event_bubbles.set(this, false);
    _Event_composed.set(this, false);
    _Event_defaultPrevented.set(this, false);
    _Event_timestamp.set(this, Date.now());
    _Event_propagationStopped.set(this, false);
    _Event_type.set(this, void 0);
    _Event_target.set(this, void 0);
    _Event_isBeingDispatched.set(this, void 0);
    this.NONE = NONE;
    this.CAPTURING_PHASE = CAPTURING_PHASE;
    this.AT_TARGET = AT_TARGET;
    this.BUBBLING_PHASE = BUBBLING_PHASE;
    if (arguments.length === 0)
      throw new Error(`The type argument must be specified`);
    if (typeof options !== "object" || !options) {
      throw new Error(`The "options" argument must be an object`);
    }
    const { bubbles, cancelable, composed } = options;
    __classPrivateFieldSet(this, _Event_cancelable, !!cancelable, "f");
    __classPrivateFieldSet(this, _Event_bubbles, !!bubbles, "f");
    __classPrivateFieldSet(this, _Event_composed, !!composed, "f");
    __classPrivateFieldSet(this, _Event_type, `${type}`, "f");
    __classPrivateFieldSet(this, _Event_target, null, "f");
    __classPrivateFieldSet(this, _Event_isBeingDispatched, false, "f");
  }
  initEvent(_type, _bubbles, _cancelable) {
    throw new Error("Method not implemented.");
  }
  stopImmediatePropagation() {
    this.stopPropagation();
  }
  preventDefault() {
    __classPrivateFieldSet(this, _Event_defaultPrevented, true, "f");
  }
  get target() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get currentTarget() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get srcElement() {
    return __classPrivateFieldGet(this, _Event_target, "f");
  }
  get type() {
    return __classPrivateFieldGet(this, _Event_type, "f");
  }
  get cancelable() {
    return __classPrivateFieldGet(this, _Event_cancelable, "f");
  }
  get defaultPrevented() {
    return __classPrivateFieldGet(this, _Event_cancelable, "f") && __classPrivateFieldGet(this, _Event_defaultPrevented, "f");
  }
  get timeStamp() {
    return __classPrivateFieldGet(this, _Event_timestamp, "f");
  }
  composedPath() {
    return __classPrivateFieldGet(this, _Event_isBeingDispatched, "f") ? [__classPrivateFieldGet(this, _Event_target, "f")] : [];
  }
  get returnValue() {
    return !__classPrivateFieldGet(this, _Event_cancelable, "f") || !__classPrivateFieldGet(this, _Event_defaultPrevented, "f");
  }
  get bubbles() {
    return __classPrivateFieldGet(this, _Event_bubbles, "f");
  }
  get composed() {
    return __classPrivateFieldGet(this, _Event_composed, "f");
  }
  get eventPhase() {
    return __classPrivateFieldGet(this, _Event_isBeingDispatched, "f") ? _a.AT_TARGET : _a.NONE;
  }
  get cancelBubble() {
    return __classPrivateFieldGet(this, _Event_propagationStopped, "f");
  }
  set cancelBubble(value) {
    if (value) {
      __classPrivateFieldSet(this, _Event_propagationStopped, true, "f");
    }
  }
  stopPropagation() {
    __classPrivateFieldSet(this, _Event_propagationStopped, true, "f");
  }
  get isTrusted() {
    return false;
  }
}, _Event_cancelable = /* @__PURE__ */ new WeakMap(), _Event_bubbles = /* @__PURE__ */ new WeakMap(), _Event_composed = /* @__PURE__ */ new WeakMap(), _Event_defaultPrevented = /* @__PURE__ */ new WeakMap(), _Event_timestamp = /* @__PURE__ */ new WeakMap(), _Event_propagationStopped = /* @__PURE__ */ new WeakMap(), _Event_type = /* @__PURE__ */ new WeakMap(), _Event_target = /* @__PURE__ */ new WeakMap(), _Event_isBeingDispatched = /* @__PURE__ */ new WeakMap(), _a.NONE = NONE, _a.CAPTURING_PHASE = CAPTURING_PHASE, _a.AT_TARGET = AT_TARGET, _a.BUBBLING_PHASE = BUBBLING_PHASE, _a);
Object.defineProperties(EventShim.prototype, {
  initEvent: enumerableProperty,
  stopImmediatePropagation: enumerableProperty,
  preventDefault: enumerableProperty,
  target: enumerableProperty,
  currentTarget: enumerableProperty,
  srcElement: enumerableProperty,
  type: enumerableProperty,
  cancelable: enumerableProperty,
  defaultPrevented: enumerableProperty,
  timeStamp: enumerableProperty,
  composedPath: enumerableProperty,
  returnValue: enumerableProperty,
  bubbles: enumerableProperty,
  composed: enumerableProperty,
  eventPhase: enumerableProperty,
  cancelBubble: enumerableProperty,
  stopPropagation: enumerableProperty,
  isTrusted: enumerableProperty
});
var CustomEventShim = (_b = class CustomEvent2 extends EventShim {
  constructor(type, options = {}) {
    super(type, options);
    _CustomEvent_detail.set(this, void 0);
    __classPrivateFieldSet(this, _CustomEvent_detail, options?.detail ?? null, "f");
  }
  initCustomEvent(_type, _bubbles, _cancelable, _detail) {
    throw new Error("Method not implemented.");
  }
  get detail() {
    return __classPrivateFieldGet(this, _CustomEvent_detail, "f");
  }
}, _CustomEvent_detail = /* @__PURE__ */ new WeakMap(), _b);
Object.defineProperties(CustomEventShim.prototype, {
  detail: enumerableProperty
});
var EventShimWithRealType = EventShim;
var CustomEventShimWithRealType = CustomEventShim;

// @lit-labs/ssr-dom-shim/lib/css.js
var _a2;
var CSSRuleShim = (_a2 = class CSSRule {
  constructor() {
    this.STYLE_RULE = 1;
    this.CHARSET_RULE = 2;
    this.IMPORT_RULE = 3;
    this.MEDIA_RULE = 4;
    this.FONT_FACE_RULE = 5;
    this.PAGE_RULE = 6;
    this.NAMESPACE_RULE = 10;
    this.KEYFRAMES_RULE = 7;
    this.KEYFRAME_RULE = 8;
    this.SUPPORTS_RULE = 12;
    this.COUNTER_STYLE_RULE = 11;
    this.FONT_FEATURE_VALUES_RULE = 14;
    this.MARGIN_RULE = 9;
    this.__parentStyleSheet = null;
    this.cssText = "";
  }
  get parentRule() {
    return null;
  }
  get parentStyleSheet() {
    return this.__parentStyleSheet;
  }
  get type() {
    return 0;
  }
}, _a2.STYLE_RULE = 1, _a2.CHARSET_RULE = 2, _a2.IMPORT_RULE = 3, _a2.MEDIA_RULE = 4, _a2.FONT_FACE_RULE = 5, _a2.PAGE_RULE = 6, _a2.NAMESPACE_RULE = 10, _a2.KEYFRAMES_RULE = 7, _a2.KEYFRAME_RULE = 8, _a2.SUPPORTS_RULE = 12, _a2.COUNTER_STYLE_RULE = 11, _a2.FONT_FEATURE_VALUES_RULE = 14, _a2.MARGIN_RULE = 9, _a2);

// @lit-labs/ssr-dom-shim/index.js
globalThis.Event ??= EventShimWithRealType;
globalThis.CustomEvent ??= CustomEventShimWithRealType;
var constructionToken = Symbol();
var isCaptureEventListener = (options) => typeof options === "boolean" ? options : options?.capture ?? false;
var enumerableProperty2 = { __proto__: null };
enumerableProperty2.enumerable = true;
Object.freeze(enumerableProperty2);
var EventTarget = class {
  constructor() {
    this.__eventListeners = /* @__PURE__ */ new Map();
    this.__captureEventListeners = /* @__PURE__ */ new Map();
  }
  addEventListener(type, callback, options) {
    if (callback === void 0 || callback === null) {
      return;
    }
    const eventListenersMap = isCaptureEventListener(options) ? this.__captureEventListeners : this.__eventListeners;
    let eventListeners = eventListenersMap.get(type);
    if (eventListeners === void 0) {
      eventListeners = /* @__PURE__ */ new Map();
      eventListenersMap.set(type, eventListeners);
    } else if (eventListeners.has(callback)) {
      return;
    }
    const normalizedOptions = typeof options === "object" && options ? options : {};
    normalizedOptions.signal?.addEventListener("abort", () => this.removeEventListener(type, callback, options));
    eventListeners.set(callback, normalizedOptions ?? {});
  }
  removeEventListener(type, callback, options) {
    if (callback === void 0 || callback === null) {
      return;
    }
    const eventListenersMap = isCaptureEventListener(options) ? this.__captureEventListeners : this.__eventListeners;
    const eventListeners = eventListenersMap.get(type);
    if (eventListeners !== void 0) {
      eventListeners.delete(callback);
      if (!eventListeners.size) {
        eventListenersMap.delete(type);
      }
    }
  }
  dispatchEvent(event) {
    let composedPath = this.__resolveFullEventPath();
    if (!event.composed && this.__host) {
      composedPath = composedPath.slice(0, composedPath.indexOf(this.__host));
    }
    let stopPropagation = false;
    let stopImmediatePropagation = false;
    let eventPhase = EventShimWithRealType.NONE;
    let target = null;
    let tmpTarget = null;
    let currentTarget = null;
    const originalStopPropagation = event.stopPropagation;
    const originalStopImmediatePropagation = event.stopImmediatePropagation;
    Object.defineProperties(event, {
      target: {
        get() {
          return target ?? tmpTarget;
        },
        ...enumerableProperty2
      },
      srcElement: {
        get() {
          return event.target;
        },
        ...enumerableProperty2
      },
      currentTarget: {
        get() {
          return currentTarget;
        },
        ...enumerableProperty2
      },
      eventPhase: {
        get() {
          return eventPhase;
        },
        ...enumerableProperty2
      },
      composedPath: {
        value: () => composedPath,
        ...enumerableProperty2
      },
      stopPropagation: {
        value: () => {
          stopPropagation = true;
          originalStopPropagation.call(event);
        },
        ...enumerableProperty2
      },
      stopImmediatePropagation: {
        value: () => {
          stopImmediatePropagation = true;
          originalStopImmediatePropagation.call(event);
        },
        ...enumerableProperty2
      }
    });
    const invokeEventListener = (listener, options, eventListenerMap) => {
      if (typeof listener === "function") {
        listener(event);
      } else if (typeof listener?.handleEvent === "function") {
        listener.handleEvent(event);
      }
      if (options.once) {
        eventListenerMap.delete(listener);
      }
    };
    const finishDispatch = () => {
      currentTarget = null;
      eventPhase = EventShimWithRealType.NONE;
      return !event.defaultPrevented;
    };
    const captureEventPath = composedPath.slice().reverse();
    target = !this.__host || !event.composed ? this : null;
    const retarget = (eventTargets) => {
      tmpTarget = this;
      while (tmpTarget.__host && eventTargets.includes(tmpTarget.__host)) {
        tmpTarget = tmpTarget.__host;
      }
    };
    for (const eventTarget of captureEventPath) {
      if (!target && (!tmpTarget || tmpTarget === eventTarget.__host)) {
        retarget(captureEventPath.slice(captureEventPath.indexOf(eventTarget)));
      }
      currentTarget = eventTarget;
      eventPhase = eventTarget === event.target ? EventShimWithRealType.AT_TARGET : EventShimWithRealType.CAPTURING_PHASE;
      const captureEventListeners = eventTarget.__captureEventListeners.get(event.type);
      if (captureEventListeners) {
        for (const [listener, options] of captureEventListeners) {
          invokeEventListener(listener, options, captureEventListeners);
          if (stopImmediatePropagation) {
            return finishDispatch();
          }
        }
      }
      if (stopPropagation) {
        return finishDispatch();
      }
    }
    const bubbleEventPath = event.bubbles ? composedPath : [this];
    tmpTarget = null;
    for (const eventTarget of bubbleEventPath) {
      if (!target && (!tmpTarget || eventTarget === tmpTarget.__host)) {
        retarget(bubbleEventPath.slice(0, bubbleEventPath.indexOf(eventTarget) + 1));
      }
      currentTarget = eventTarget;
      eventPhase = eventTarget === event.target ? EventShimWithRealType.AT_TARGET : EventShimWithRealType.BUBBLING_PHASE;
      const eventListeners = eventTarget.__eventListeners.get(event.type);
      if (eventListeners) {
        for (const [listener, options] of eventListeners) {
          invokeEventListener(listener, options, eventListeners);
          if (stopImmediatePropagation) {
            return finishDispatch();
          }
        }
      }
      if (stopPropagation) {
        return finishDispatch();
      }
    }
    return finishDispatch();
  }
  __resolveFullEventPath() {
    if (this.__eventPathCache) {
      return this.__eventPathCache;
    } else if (!this.__eventTargetParent) {
      return this.__eventPathCache = [this, documentShim, windowShim];
    } else {
      return this.__eventPathCache = [
        this,
        ...this.__eventTargetParent.__resolveFullEventPath()
      ];
    }
  }
};
var attributes = /* @__PURE__ */ new WeakMap();
var attributesForElement = (element) => {
  let attrs = attributes.get(element);
  if (attrs === void 0) {
    attributes.set(element, attrs = /* @__PURE__ */ new Map());
  }
  return attrs;
};
var NodeShim = class Node2 extends EventTarget {
  getRootNode(options) {
    if (options?.composed) {
      return document2;
    }
    const host = this.__host;
    return host?.__shadowRoot ?? document2;
  }
};
var DocumentShim = class Document2 extends NodeShim {
  get adoptedStyleSheets() {
    return [];
  }
  createTreeWalker() {
    return {};
  }
  createTextNode() {
    return {};
  }
  createElement() {
    return {};
  }
};
var documentShim = new DocumentShim();
var document2 = documentShim;
var WindowShim = class Window extends NodeShim {
  constructor(token) {
    super();
    if (token !== constructionToken) {
      throw new TypeError("Illegal constructor");
    }
    Object.assign(this, globalThis, {
      CustomElementRegistry,
      customElements: customElements2,
      document: document2,
      Document: DocumentShim,
      Element: ElementShim,
      EventTarget,
      HTMLElement: HTMLElementShim,
      Node: NodeShim,
      ShadowRoot: ShadowRootShim,
      window: this,
      Window: WindowShim
    });
  }
};
var ElementShim = class Element extends NodeShim {
  constructor() {
    super(...arguments);
    this.__shadowRootMode = null;
    this.__shadowRoot = null;
    this.__internals = null;
  }
  get attributes() {
    return Array.from(attributesForElement(this)).map(([name, value]) => ({
      name,
      value
    }));
  }
  get shadowRoot() {
    if (this.__shadowRootMode === "closed") {
      return null;
    }
    return this.__shadowRoot;
  }
  get localName() {
    return this.constructor.__localName;
  }
  get tagName() {
    return this.localName?.toUpperCase();
  }
  setAttribute(name, value) {
    attributesForElement(this).set(name, String(value));
  }
  removeAttribute(name) {
    attributesForElement(this).delete(name);
  }
  toggleAttribute(name, force) {
    if (this.hasAttribute(name)) {
      if (force === void 0 || !force) {
        this.removeAttribute(name);
        return false;
      }
    } else {
      if (force === void 0 || force) {
        this.setAttribute(name, "");
        return true;
      } else {
        return false;
      }
    }
    return true;
  }
  hasAttribute(name) {
    return attributesForElement(this).has(name);
  }
  attachShadow(init) {
    this.__shadowRootMode = init.mode;
    const shadowRoot = new ShadowRootShim(constructionToken, init);
    shadowRoot.__eventTargetParent = this;
    shadowRoot.__host = this;
    return this.__shadowRoot = shadowRoot;
  }
  attachInternals() {
    if (this.__internals !== null) {
      throw new Error(`Failed to execute 'attachInternals' on 'HTMLElement': ElementInternals for the specified element was already attached.`);
    }
    const internals = new ElementInternalsShim(this);
    this.__internals = internals;
    return internals;
  }
  getAttribute(name) {
    const value = attributesForElement(this).get(name);
    return value ?? null;
  }
};
var HTMLElementShim = class HTMLElement extends ElementShim {
};
var HTMLElementShimWithRealType = HTMLElementShim;
var ShadowRootShim = class ShadowRoot extends NodeShim {
  get host() {
    return this.__host;
  }
  constructor(constructionToken2, init) {
    super();
    if (constructionToken2 !== constructionToken2) {
      throw new TypeError("Illegal constructor");
    }
    this.mode = init.mode;
  }
};
globalThis.litServerRoot ??= Object.defineProperty(new HTMLElementShimWithRealType(), "localName", {
  // Patch localName (and tagName) to return a unique name.
  get() {
    return "lit-server-root";
  }
});
function promiseWithResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
var CustomElementRegistry = class {
  constructor() {
    this.__definitions = /* @__PURE__ */ new Map();
    this.__reverseDefinitions = /* @__PURE__ */ new Map();
    this.__pendingWhenDefineds = /* @__PURE__ */ new Map();
  }
  define(name, ctor) {
    if (this.__definitions.has(name)) {
      if (true) {
        console.warn(`'CustomElementRegistry' already has "${name}" defined. This may have been caused by live reload or hot module replacement in which case it can be safely ignored.
Make sure to test your application with a production build as repeat registrations will throw in production.`);
      } else {
        throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': the name "${name}" has already been used with this registry`);
      }
    }
    if (this.__reverseDefinitions.has(ctor)) {
      throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': the constructor has already been used with this registry for the tag name ${this.__reverseDefinitions.get(ctor)}`);
    }
    ctor.__localName = name;
    this.__definitions.set(name, {
      ctor,
      // Note it's important we read `observedAttributes` in case it is a getter
      // with side-effects, as is the case in Lit, where it triggers class
      // finalization.
      //
      // TODO(aomarks) To be spec compliant, we should also capture the
      // registration-time lifecycle methods like `connectedCallback`. For them
      // to be actually accessible to e.g. the Lit SSR element renderer, though,
      // we'd need to introduce a new API for accessing them (since `get` only
      // returns the constructor).
      observedAttributes: ctor.observedAttributes ?? []
    });
    this.__reverseDefinitions.set(ctor, name);
    this.__pendingWhenDefineds.get(name)?.resolve(ctor);
    this.__pendingWhenDefineds.delete(name);
  }
  get(name) {
    const definition = this.__definitions.get(name);
    return definition?.ctor;
  }
  getName(ctor) {
    return this.__reverseDefinitions.get(ctor) ?? null;
  }
  initialize(_root) {
    throw new Error(`customElements.initialize is not currently supported in SSR. Please file a bug if you need it.`);
  }
  upgrade(_element) {
    throw new Error(`customElements.upgrade is not currently supported in SSR. Please file a bug if you need it.`);
  }
  async whenDefined(name) {
    const definition = this.__definitions.get(name);
    if (definition) {
      return definition.ctor;
    }
    let withResolvers = this.__pendingWhenDefineds.get(name);
    if (!withResolvers) {
      withResolvers = promiseWithResolvers();
      this.__pendingWhenDefineds.set(name, withResolvers);
    }
    return withResolvers.promise;
  }
};
var CustomElementRegistryShimWithRealType = CustomElementRegistry;
var customElements2 = new CustomElementRegistryShimWithRealType();
var windowShim = new WindowShim(constructionToken);

// @lit/reactive-element/node/css-tag.js
var t = globalThis;
var e = t.ShadowRoot && (void 0 === t.ShadyCSS || t.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype;
var s = Symbol();
var o = /* @__PURE__ */ new WeakMap();
var n = class {
  constructor(t5, e6, o7) {
    if (this._$cssResult$ = true, o7 !== s) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t5, this.t = e6;
  }
  get styleSheet() {
    let t5 = this.o;
    const s5 = this.t;
    if (e && void 0 === t5) {
      const e6 = void 0 !== s5 && 1 === s5.length;
      e6 && (t5 = o.get(s5)), void 0 === t5 && ((this.o = t5 = new CSSStyleSheet()).replaceSync(this.cssText), e6 && o.set(s5, t5));
    }
    return t5;
  }
  toString() {
    return this.cssText;
  }
};
var r = (t5) => new n("string" == typeof t5 ? t5 : t5 + "", void 0, s);
var i = (t5, ...e6) => {
  const o7 = 1 === t5.length ? t5[0] : e6.reduce((e7, s5, o8) => e7 + ((t6) => {
    if (true === t6._$cssResult$) return t6.cssText;
    if ("number" == typeof t6) return t6;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + t6 + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s5) + t5[o8 + 1], t5[0]);
  return new n(o7, t5, s);
};
var S = (s5, o7) => {
  if (e) s5.adoptedStyleSheets = o7.map((t5) => t5 instanceof CSSStyleSheet ? t5 : t5.styleSheet);
  else for (const e6 of o7) {
    const o8 = document.createElement("style"), n6 = t.litNonce;
    void 0 !== n6 && o8.setAttribute("nonce", n6), o8.textContent = e6.cssText, s5.appendChild(o8);
  }
};
var c = e || void 0 === t.CSSStyleSheet ? (t5) => t5 : (t5) => t5 instanceof CSSStyleSheet ? ((t6) => {
  let e6 = "";
  for (const s5 of t6.cssRules) e6 += s5.cssText;
  return r(e6);
})(t5) : t5;

// @lit/reactive-element/node/reactive-element.js
var { is: h, defineProperty: r2, getOwnPropertyDescriptor: o2, getOwnPropertyNames: n2, getOwnPropertySymbols: a, getPrototypeOf: c2 } = Object;
var l = globalThis;
l.customElements ??= customElements2;
var p = l.trustedTypes;
var d = p ? p.emptyScript : "";
var u = l.reactiveElementPolyfillSupport;
var f = (t5, s5) => t5;
var b = { toAttribute(t5, s5) {
  switch (s5) {
    case Boolean:
      t5 = t5 ? d : null;
      break;
    case Object:
    case Array:
      t5 = null == t5 ? t5 : JSON.stringify(t5);
  }
  return t5;
}, fromAttribute(t5, s5) {
  let i7 = t5;
  switch (s5) {
    case Boolean:
      i7 = null !== t5;
      break;
    case Number:
      i7 = null === t5 ? null : Number(t5);
      break;
    case Object:
    case Array:
      try {
        i7 = JSON.parse(t5);
      } catch (t6) {
        i7 = null;
      }
  }
  return i7;
} };
var m = (t5, s5) => !h(t5, s5);
var y = { attribute: true, type: String, converter: b, reflect: false, useDefault: false, hasChanged: m };
Symbol.metadata ??= Symbol("metadata"), l.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var g = class extends (globalThis.HTMLElement ?? HTMLElementShimWithRealType) {
  static addInitializer(t5) {
    this._$Ei(), (this.l ??= []).push(t5);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t5, s5 = y) {
    if (s5.state && (s5.attribute = false), this._$Ei(), this.prototype.hasOwnProperty(t5) && ((s5 = Object.create(s5)).wrapped = true), this.elementProperties.set(t5, s5), !s5.noAccessor) {
      const i7 = Symbol(), e6 = this.getPropertyDescriptor(t5, i7, s5);
      void 0 !== e6 && r2(this.prototype, t5, e6);
    }
  }
  static getPropertyDescriptor(t5, s5, i7) {
    const { get: e6, set: h4 } = o2(this.prototype, t5) ?? { get() {
      return this[s5];
    }, set(t6) {
      this[s5] = t6;
    } };
    return { get: e6, set(s6) {
      const r6 = e6?.call(this);
      h4?.call(this, s6), this.requestUpdate(t5, r6, i7);
    }, configurable: true, enumerable: true };
  }
  static getPropertyOptions(t5) {
    return this.elementProperties.get(t5) ?? y;
  }
  static _$Ei() {
    if (this.hasOwnProperty(f("elementProperties"))) return;
    const t5 = c2(this);
    t5.finalize(), void 0 !== t5.l && (this.l = [...t5.l]), this.elementProperties = new Map(t5.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(f("finalized"))) return;
    if (this.finalized = true, this._$Ei(), this.hasOwnProperty(f("properties"))) {
      const t6 = this.properties, s5 = [...n2(t6), ...a(t6)];
      for (const i7 of s5) this.createProperty(i7, t6[i7]);
    }
    const t5 = this[Symbol.metadata];
    if (null !== t5) {
      const s5 = litPropertyMetadata.get(t5);
      if (void 0 !== s5) for (const [t6, i7] of s5) this.elementProperties.set(t6, i7);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t6, s5] of this.elementProperties) {
      const i7 = this._$Eu(t6, s5);
      void 0 !== i7 && this._$Eh.set(i7, t6);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t5) {
    const s5 = [];
    if (Array.isArray(t5)) {
      const e6 = new Set(t5.flat(1 / 0).reverse());
      for (const t6 of e6) s5.unshift(c(t6));
    } else void 0 !== t5 && s5.push(c(t5));
    return s5;
  }
  static _$Eu(t5, s5) {
    const i7 = s5.attribute;
    return false === i7 ? void 0 : "string" == typeof i7 ? i7 : "string" == typeof t5 ? t5.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = false, this.hasUpdated = false, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((t5) => this.enableUpdating = t5), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((t5) => t5(this));
  }
  addController(t5) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(t5), void 0 !== this.renderRoot && this.isConnected && t5.hostConnected?.();
  }
  removeController(t5) {
    this._$EO?.delete(t5);
  }
  _$E_() {
    const t5 = /* @__PURE__ */ new Map(), s5 = this.constructor.elementProperties;
    for (const i7 of s5.keys()) this.hasOwnProperty(i7) && (t5.set(i7, this[i7]), delete this[i7]);
    t5.size > 0 && (this._$Ep = t5);
  }
  createRenderRoot() {
    const t5 = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return S(t5, this.constructor.elementStyles), t5;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(true), this._$EO?.forEach((t5) => t5.hostConnected?.());
  }
  enableUpdating(t5) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((t5) => t5.hostDisconnected?.());
  }
  attributeChangedCallback(t5, s5, i7) {
    this._$AK(t5, i7);
  }
  _$ET(t5, s5) {
    const i7 = this.constructor.elementProperties.get(t5), e6 = this.constructor._$Eu(t5, i7);
    if (void 0 !== e6 && true === i7.reflect) {
      const h4 = (void 0 !== i7.converter?.toAttribute ? i7.converter : b).toAttribute(s5, i7.type);
      this._$Em = t5, null == h4 ? this.removeAttribute(e6) : this.setAttribute(e6, h4), this._$Em = null;
    }
  }
  _$AK(t5, s5) {
    const i7 = this.constructor, e6 = i7._$Eh.get(t5);
    if (void 0 !== e6 && this._$Em !== e6) {
      const t6 = i7.getPropertyOptions(e6), h4 = "function" == typeof t6.converter ? { fromAttribute: t6.converter } : void 0 !== t6.converter?.fromAttribute ? t6.converter : b;
      this._$Em = e6;
      const r6 = h4.fromAttribute(s5, t6.type);
      this[e6] = r6 ?? this._$Ej?.get(e6) ?? r6, this._$Em = null;
    }
  }
  requestUpdate(t5, s5, i7, e6 = false, h4) {
    if (void 0 !== t5) {
      const r6 = this.constructor;
      if (false === e6 && (h4 = this[t5]), i7 ??= r6.getPropertyOptions(t5), !((i7.hasChanged ?? m)(h4, s5) || i7.useDefault && i7.reflect && h4 === this._$Ej?.get(t5) && !this.hasAttribute(r6._$Eu(t5, i7)))) return;
      this.C(t5, s5, i7);
    }
    false === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t5, s5, { useDefault: i7, reflect: e6, wrapped: h4 }, r6) {
    i7 && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(t5) && (this._$Ej.set(t5, r6 ?? s5 ?? this[t5]), true !== h4 || void 0 !== r6) || (this._$AL.has(t5) || (this.hasUpdated || i7 || (s5 = void 0), this._$AL.set(t5, s5)), true === e6 && this._$Em !== t5 && (this._$Eq ??= /* @__PURE__ */ new Set()).add(t5));
  }
  async _$EP() {
    this.isUpdatePending = true;
    try {
      await this._$ES;
    } catch (t6) {
      Promise.reject(t6);
    }
    const t5 = this.scheduleUpdate();
    return null != t5 && await t5, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [t7, s6] of this._$Ep) this[t7] = s6;
        this._$Ep = void 0;
      }
      const t6 = this.constructor.elementProperties;
      if (t6.size > 0) for (const [s6, i7] of t6) {
        const { wrapped: t7 } = i7, e6 = this[s6];
        true !== t7 || this._$AL.has(s6) || void 0 === e6 || this.C(s6, void 0, i7, e6);
      }
    }
    let t5 = false;
    const s5 = this._$AL;
    try {
      t5 = this.shouldUpdate(s5), t5 ? (this.willUpdate(s5), this._$EO?.forEach((t6) => t6.hostUpdate?.()), this.update(s5)) : this._$EM();
    } catch (s6) {
      throw t5 = false, this._$EM(), s6;
    }
    t5 && this._$AE(s5);
  }
  willUpdate(t5) {
  }
  _$AE(t5) {
    this._$EO?.forEach((t6) => t6.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = true, this.firstUpdated(t5)), this.updated(t5);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = false;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t5) {
    return true;
  }
  update(t5) {
    this._$Eq &&= this._$Eq.forEach((t6) => this._$ET(t6, this[t6])), this._$EM();
  }
  updated(t5) {
  }
  firstUpdated(t5) {
  }
};
g.elementStyles = [], g.shadowRootOptions = { mode: "open" }, g[f("elementProperties")] = /* @__PURE__ */ new Map(), g[f("finalized")] = /* @__PURE__ */ new Map(), u?.({ ReactiveElement: g }), (l.reactiveElementVersions ??= []).push("2.1.2");

// lit-html/lit-html.js
var t2 = globalThis;
var i2 = (t5) => t5;
var s2 = t2.trustedTypes;
var e2 = s2 ? s2.createPolicy("lit-html", { createHTML: (t5) => t5 }) : void 0;
var h2 = "$lit$";
var o3 = `lit$${Math.random().toFixed(9).slice(2)}$`;
var n3 = "?" + o3;
var r3 = `<${n3}>`;
var l2 = document;
var c3 = () => l2.createComment("");
var a2 = (t5) => null === t5 || "object" != typeof t5 && "function" != typeof t5;
var u2 = Array.isArray;
var d2 = (t5) => u2(t5) || "function" == typeof t5?.[Symbol.iterator];
var f2 = "[ 	\n\f\r]";
var v = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;
var _ = /-->/g;
var m2 = />/g;
var p2 = RegExp(`>|${f2}(?:([^\\s"'>=/]+)(${f2}*=${f2}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g");
var g2 = /'/g;
var $ = /"/g;
var y2 = /^(?:script|style|textarea|title)$/i;
var x = (t5) => (i7, ...s5) => ({ _$litType$: t5, strings: i7, values: s5 });
var b2 = x(1);
var w = x(2);
var T = x(3);
var E = Symbol.for("lit-noChange");
var A = Symbol.for("lit-nothing");
var C = /* @__PURE__ */ new WeakMap();
var P = l2.createTreeWalker(l2, 129);
function V(t5, i7) {
  if (!u2(t5) || !t5.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return void 0 !== e2 ? e2.createHTML(i7) : i7;
}
var N = (t5, i7) => {
  const s5 = t5.length - 1, e6 = [];
  let n6, l3 = 2 === i7 ? "<svg>" : 3 === i7 ? "<math>" : "", c5 = v;
  for (let i8 = 0; i8 < s5; i8++) {
    const s6 = t5[i8];
    let a3, u5, d3 = -1, f3 = 0;
    for (; f3 < s6.length && (c5.lastIndex = f3, u5 = c5.exec(s6), null !== u5); ) f3 = c5.lastIndex, c5 === v ? "!--" === u5[1] ? c5 = _ : void 0 !== u5[1] ? c5 = m2 : void 0 !== u5[2] ? (y2.test(u5[2]) && (n6 = RegExp("</" + u5[2], "g")), c5 = p2) : void 0 !== u5[3] && (c5 = p2) : c5 === p2 ? ">" === u5[0] ? (c5 = n6 ?? v, d3 = -1) : void 0 === u5[1] ? d3 = -2 : (d3 = c5.lastIndex - u5[2].length, a3 = u5[1], c5 = void 0 === u5[3] ? p2 : '"' === u5[3] ? $ : g2) : c5 === $ || c5 === g2 ? c5 = p2 : c5 === _ || c5 === m2 ? c5 = v : (c5 = p2, n6 = void 0);
    const x2 = c5 === p2 && t5[i8 + 1].startsWith("/>") ? " " : "";
    l3 += c5 === v ? s6 + r3 : d3 >= 0 ? (e6.push(a3), s6.slice(0, d3) + h2 + s6.slice(d3) + o3 + x2) : s6 + o3 + (-2 === d3 ? i8 : x2);
  }
  return [V(t5, l3 + (t5[s5] || "<?>") + (2 === i7 ? "</svg>" : 3 === i7 ? "</math>" : "")), e6];
};
var S2 = class _S {
  constructor({ strings: t5, _$litType$: i7 }, e6) {
    let r6;
    this.parts = [];
    let l3 = 0, a3 = 0;
    const u5 = t5.length - 1, d3 = this.parts, [f3, v3] = N(t5, i7);
    if (this.el = _S.createElement(f3, e6), P.currentNode = this.el.content, 2 === i7 || 3 === i7) {
      const t6 = this.el.content.firstChild;
      t6.replaceWith(...t6.childNodes);
    }
    for (; null !== (r6 = P.nextNode()) && d3.length < u5; ) {
      if (1 === r6.nodeType) {
        if (r6.hasAttributes()) for (const t6 of r6.getAttributeNames()) if (t6.endsWith(h2)) {
          const i8 = v3[a3++], s5 = r6.getAttribute(t6).split(o3), e7 = /([.?@])?(.*)/.exec(i8);
          d3.push({ type: 1, index: l3, name: e7[2], strings: s5, ctor: "." === e7[1] ? I : "?" === e7[1] ? L : "@" === e7[1] ? z : H }), r6.removeAttribute(t6);
        } else t6.startsWith(o3) && (d3.push({ type: 6, index: l3 }), r6.removeAttribute(t6));
        if (y2.test(r6.tagName)) {
          const t6 = r6.textContent.split(o3), i8 = t6.length - 1;
          if (i8 > 0) {
            r6.textContent = s2 ? s2.emptyScript : "";
            for (let s5 = 0; s5 < i8; s5++) r6.append(t6[s5], c3()), P.nextNode(), d3.push({ type: 2, index: ++l3 });
            r6.append(t6[i8], c3());
          }
        }
      } else if (8 === r6.nodeType) if (r6.data === n3) d3.push({ type: 2, index: l3 });
      else {
        let t6 = -1;
        for (; -1 !== (t6 = r6.data.indexOf(o3, t6 + 1)); ) d3.push({ type: 7, index: l3 }), t6 += o3.length - 1;
      }
      l3++;
    }
  }
  static createElement(t5, i7) {
    const s5 = l2.createElement("template");
    return s5.innerHTML = t5, s5;
  }
};
function M(t5, i7, s5 = t5, e6) {
  if (i7 === E) return i7;
  let h4 = void 0 !== e6 ? s5._$Co?.[e6] : s5._$Cl;
  const o7 = a2(i7) ? void 0 : i7._$litDirective$;
  return h4?.constructor !== o7 && (h4?._$AO?.(false), void 0 === o7 ? h4 = void 0 : (h4 = new o7(t5), h4._$AT(t5, s5, e6)), void 0 !== e6 ? (s5._$Co ??= [])[e6] = h4 : s5._$Cl = h4), void 0 !== h4 && (i7 = M(t5, h4._$AS(t5, i7.values), h4, e6)), i7;
}
var R = class {
  constructor(t5, i7) {
    this._$AV = [], this._$AN = void 0, this._$AD = t5, this._$AM = i7;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t5) {
    const { el: { content: i7 }, parts: s5 } = this._$AD, e6 = (t5?.creationScope ?? l2).importNode(i7, true);
    P.currentNode = e6;
    let h4 = P.nextNode(), o7 = 0, n6 = 0, r6 = s5[0];
    for (; void 0 !== r6; ) {
      if (o7 === r6.index) {
        let i8;
        2 === r6.type ? i8 = new k(h4, h4.nextSibling, this, t5) : 1 === r6.type ? i8 = new r6.ctor(h4, r6.name, r6.strings, this, t5) : 6 === r6.type && (i8 = new Z(h4, this, t5)), this._$AV.push(i8), r6 = s5[++n6];
      }
      o7 !== r6?.index && (h4 = P.nextNode(), o7++);
    }
    return P.currentNode = l2, e6;
  }
  p(t5) {
    let i7 = 0;
    for (const s5 of this._$AV) void 0 !== s5 && (void 0 !== s5.strings ? (s5._$AI(t5, s5, i7), i7 += s5.strings.length - 2) : s5._$AI(t5[i7])), i7++;
  }
};
var k = class _k {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t5, i7, s5, e6) {
    this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = t5, this._$AB = i7, this._$AM = s5, this.options = e6, this._$Cv = e6?.isConnected ?? true;
  }
  get parentNode() {
    let t5 = this._$AA.parentNode;
    const i7 = this._$AM;
    return void 0 !== i7 && 11 === t5?.nodeType && (t5 = i7.parentNode), t5;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t5, i7 = this) {
    t5 = M(this, t5, i7), a2(t5) ? t5 === A || null == t5 || "" === t5 ? (this._$AH !== A && this._$AR(), this._$AH = A) : t5 !== this._$AH && t5 !== E && this._(t5) : void 0 !== t5._$litType$ ? this.$(t5) : void 0 !== t5.nodeType ? this.T(t5) : d2(t5) ? this.k(t5) : this._(t5);
  }
  O(t5) {
    return this._$AA.parentNode.insertBefore(t5, this._$AB);
  }
  T(t5) {
    this._$AH !== t5 && (this._$AR(), this._$AH = this.O(t5));
  }
  _(t5) {
    this._$AH !== A && a2(this._$AH) ? this._$AA.nextSibling.data = t5 : this.T(l2.createTextNode(t5)), this._$AH = t5;
  }
  $(t5) {
    const { values: i7, _$litType$: s5 } = t5, e6 = "number" == typeof s5 ? this._$AC(t5) : (void 0 === s5.el && (s5.el = S2.createElement(V(s5.h, s5.h[0]), this.options)), s5);
    if (this._$AH?._$AD === e6) this._$AH.p(i7);
    else {
      const t6 = new R(e6, this), s6 = t6.u(this.options);
      t6.p(i7), this.T(s6), this._$AH = t6;
    }
  }
  _$AC(t5) {
    let i7 = C.get(t5.strings);
    return void 0 === i7 && C.set(t5.strings, i7 = new S2(t5)), i7;
  }
  k(t5) {
    u2(this._$AH) || (this._$AH = [], this._$AR());
    const i7 = this._$AH;
    let s5, e6 = 0;
    for (const h4 of t5) e6 === i7.length ? i7.push(s5 = new _k(this.O(c3()), this.O(c3()), this, this.options)) : s5 = i7[e6], s5._$AI(h4), e6++;
    e6 < i7.length && (this._$AR(s5 && s5._$AB.nextSibling, e6), i7.length = e6);
  }
  _$AR(t5 = this._$AA.nextSibling, s5) {
    for (this._$AP?.(false, true, s5); t5 !== this._$AB; ) {
      const s6 = i2(t5).nextSibling;
      i2(t5).remove(), t5 = s6;
    }
  }
  setConnected(t5) {
    void 0 === this._$AM && (this._$Cv = t5, this._$AP?.(t5));
  }
};
var H = class {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t5, i7, s5, e6, h4) {
    this.type = 1, this._$AH = A, this._$AN = void 0, this.element = t5, this.name = i7, this._$AM = e6, this.options = h4, s5.length > 2 || "" !== s5[0] || "" !== s5[1] ? (this._$AH = Array(s5.length - 1).fill(new String()), this.strings = s5) : this._$AH = A;
  }
  _$AI(t5, i7 = this, s5, e6) {
    const h4 = this.strings;
    let o7 = false;
    if (void 0 === h4) t5 = M(this, t5, i7, 0), o7 = !a2(t5) || t5 !== this._$AH && t5 !== E, o7 && (this._$AH = t5);
    else {
      const e7 = t5;
      let n6, r6;
      for (t5 = h4[0], n6 = 0; n6 < h4.length - 1; n6++) r6 = M(this, e7[s5 + n6], i7, n6), r6 === E && (r6 = this._$AH[n6]), o7 ||= !a2(r6) || r6 !== this._$AH[n6], r6 === A ? t5 = A : t5 !== A && (t5 += (r6 ?? "") + h4[n6 + 1]), this._$AH[n6] = r6;
    }
    o7 && !e6 && this.j(t5);
  }
  j(t5) {
    t5 === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t5 ?? "");
  }
};
var I = class extends H {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t5) {
    this.element[this.name] = t5 === A ? void 0 : t5;
  }
};
var L = class extends H {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t5) {
    this.element.toggleAttribute(this.name, !!t5 && t5 !== A);
  }
};
var z = class extends H {
  constructor(t5, i7, s5, e6, h4) {
    super(t5, i7, s5, e6, h4), this.type = 5;
  }
  _$AI(t5, i7 = this) {
    if ((t5 = M(this, t5, i7, 0) ?? A) === E) return;
    const s5 = this._$AH, e6 = t5 === A && s5 !== A || t5.capture !== s5.capture || t5.once !== s5.once || t5.passive !== s5.passive, h4 = t5 !== A && (s5 === A || e6);
    e6 && this.element.removeEventListener(this.name, this, s5), h4 && this.element.addEventListener(this.name, this, t5), this._$AH = t5;
  }
  handleEvent(t5) {
    "function" == typeof this._$AH ? this._$AH.call(this.options?.host ?? this.element, t5) : this._$AH.handleEvent(t5);
  }
};
var Z = class {
  constructor(t5, i7, s5) {
    this.element = t5, this.type = 6, this._$AN = void 0, this._$AM = i7, this.options = s5;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t5) {
    M(this, t5);
  }
};
var j = { M: h2, P: o3, A: n3, C: 1, L: N, R, D: d2, V: M, I: k, H, N: L, U: z, B: I, F: Z };
var B = t2.litHtmlPolyfillSupport;
B?.(S2, k), (t2.litHtmlVersions ??= []).push("3.3.3");
var D = (t5, i7, s5) => {
  const e6 = s5?.renderBefore ?? i7;
  let h4 = e6._$litPart$;
  if (void 0 === h4) {
    const t6 = s5?.renderBefore ?? null;
    e6._$litPart$ = h4 = new k(i7.insertBefore(c3(), t6), t6, void 0, s5 ?? {});
  }
  return h4._$AI(t5), h4;
};

// lit-element/lit-element.js
var s3 = globalThis;
var i3 = class extends g {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const t5 = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= t5.firstChild, t5;
  }
  update(t5) {
    const r6 = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t5), this._$Do = D(r6, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(true);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(false);
  }
  render() {
    return E;
  }
};
i3._$litElement$ = true, i3["finalized"] = true, s3.litElementHydrateSupport?.({ LitElement: i3 });
var o4 = s3.litElementPolyfillSupport;
o4?.({ LitElement: i3 });
(s3.litElementVersions ??= []).push("4.2.2");

// @lit/reactive-element/node/decorators/property.js
var o5 = { attribute: true, type: String, converter: b, reflect: false, hasChanged: m };
var r4 = (t5 = o5, e6, r6) => {
  const { kind: n6, metadata: i7 } = r6;
  let s5 = globalThis.litPropertyMetadata.get(i7);
  if (void 0 === s5 && globalThis.litPropertyMetadata.set(i7, s5 = /* @__PURE__ */ new Map()), "setter" === n6 && ((t5 = Object.create(t5)).wrapped = true), s5.set(r6.name, t5), "accessor" === n6) {
    const { name: o7 } = r6;
    return { set(r7) {
      const n7 = e6.get.call(this);
      e6.set.call(this, r7), this.requestUpdate(o7, n7, t5, true, r7);
    }, init(e7) {
      return void 0 !== e7 && this.C(o7, void 0, t5, e7), e7;
    } };
  }
  if ("setter" === n6) {
    const { name: o7 } = r6;
    return function(r7) {
      const n7 = this[o7];
      e6.call(this, r7), this.requestUpdate(o7, n7, t5, true, r7);
    };
  }
  throw Error("Unsupported decorator location: " + n6);
};
function n4(t5) {
  return (e6, o7) => "object" == typeof o7 ? r4(t5, e6, o7) : ((t6, e7, o8) => {
    const r6 = e7.hasOwnProperty(o8);
    return e7.constructor.createProperty(o8, t6), r6 ? Object.getOwnPropertyDescriptor(e7, o8) : void 0;
  })(t5, e6, o7);
}

// @lit/reactive-element/node/decorators/state.js
function r5(r6) {
  return n4({ ...r6, state: true, attribute: false });
}

// @lit/reactive-element/node/decorators/base.js
var e3 = (e6, t5, c5) => (c5.configurable = true, c5.enumerable = true, Reflect.decorate && "object" != typeof t5 && Object.defineProperty(e6, t5, c5), c5);

// @lit/reactive-element/node/decorators/query.js
function e4(e6, r6) {
  return (n6, s5, i7) => {
    const o7 = (t5) => t5.renderRoot?.querySelector(e6) ?? null;
    if (r6) {
      const { get: e7, set: r7 } = "object" == typeof s5 ? n6 : i7 ?? (() => {
        const t5 = Symbol();
        return { get() {
          return this[t5];
        }, set(e8) {
          this[t5] = e8;
        } };
      })();
      return e3(n6, s5, { get() {
        let t5 = e7.call(this);
        return void 0 === t5 && (t5 = o7(this), (null !== t5 || this.hasUpdated) && r7.call(this, t5)), t5;
      } });
    }
    return e3(n6, s5, { get() {
      return o7(this);
    } });
  };
}

// @erplora/outfitkit/dist/define.js
function define(tag, ctor) {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, ctor);
  }
}

// @erplora/outfitkit/dist/shared/icons.js
var rawAdd = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 112v288m144-144H112"/></svg>';
var rawAlertCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208s208-93.31 208-208S370.69 48 256 48m0 319.91a20 20 0 1 1 20-20a20 20 0 0 1-20 20m21.72-201.15l-5.74 122a16 16 0 0 1-32 0l-5.74-121.94v-.05a21.74 21.74 0 1 1 43.44 0Z"/></svg>';
var rawAlertCircleOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192s192-86 192-192Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M250.26 166.05L256 288l5.73-121.95a5.74 5.74 0 0 0-5.79-6h0a5.74 5.74 0 0 0-5.68 6"/><path fill="currentColor" d="M256 367.91a20 20 0 1 1 20-20a20 20 0 0 1-20 20"/></svg>';
var rawAppsOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><rect width="80" height="80" x="64" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="64" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="64" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="216" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="64" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="216" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/><rect width="80" height="80" x="368" y="368" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" rx="40" ry="40"/></svg>';
var rawArchiveOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M80 152v256a40.12 40.12 0 0 0 40 40h272a40.12 40.12 0 0 0 40-40V152"/><rect width="416" height="80" x="48" y="64" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" rx="28" ry="28"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m320 304l-64 64l-64-64m64 41.89V224"/></svg>';
var rawArrowRedoOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M448 256L272 88v96C103.57 184 64 304.77 64 424c48.61-62.24 91.6-96 208-96v96Z"/></svg>';
var rawArrowUndoOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M240 424v-96c116.4 0 159.39 33.76 208 96c0-119.23-39.57-240-208-240V88L64 256Z"/></svg>';
var rawBackspaceOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M135.19 390.14a28.8 28.8 0 0 0 21.68 9.86h246.26A29 29 0 0 0 432 371.13V140.87A29 29 0 0 0 403.13 112H156.87a28.84 28.84 0 0 0-21.67 9.84L46.33 256l88.86 134.11Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336.67 192.33L206.66 322.34m130.01 0L206.66 192.33m130.01 0L206.66 322.34m130.01 0L206.66 192.33"/></svg>';
var rawCalendarOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><rect width="416" height="384" x="48" y="80" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" rx="48"/><circle cx="296" cy="232" r="24" fill="currentColor"/><circle cx="376" cy="232" r="24" fill="currentColor"/><circle cx="296" cy="312" r="24" fill="currentColor"/><circle cx="376" cy="312" r="24" fill="currentColor"/><circle cx="136" cy="312" r="24" fill="currentColor"/><circle cx="216" cy="312" r="24" fill="currentColor"/><circle cx="136" cy="392" r="24" fill="currentColor"/><circle cx="216" cy="392" r="24" fill="currentColor"/><circle cx="296" cy="392" r="24" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M128 48v32m256-32v32"/><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M464 160H48"/></svg>';
var rawCheckmarkCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208s208-93.31 208-208S370.69 48 256 48m108.25 138.29l-134.4 160a16 16 0 0 1-12 5.71h-.27a16 16 0 0 1-11.89-5.3l-57.6-64a16 16 0 1 1 23.78-21.4l45.29 50.32l122.59-145.91a16 16 0 0 1 24.5 20.58"/></svg>';
var rawCheckmarkOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M416 128L192 384l-96-96"/></svg>';
var rawChevronBack = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M328 112L184 256l144 144"/></svg>';
var rawChevronBackOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M328 112L184 256l144 144"/></svg>';
var rawChevronDownOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m112 184l144 144l144-144"/></svg>';
var rawChevronForward = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m184 112l144 144l-144 144"/></svg>';
var rawChevronForwardOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m184 112l144 144l-144 144"/></svg>';
var rawChevronUpOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="m112 328l144-144l144 144"/></svg>';
var rawClose = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="m289.94 256l95-95A24 24 0 0 0 351 127l-95 95l-95-95a24 24 0 0 0-34 34l95 95l-95 95a24 24 0 1 0 34 34l95-95l95 95a24 24 0 0 0 34-34Z"/></svg>';
var rawCloseOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M368 368L144 144m224 0L144 368"/></svg>';
var rawCloudUploadOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M320 367.79h76c55 0 100-29.21 100-83.6s-53-81.47-96-83.6c-8.89-85.06-71-136.8-144-136.8c-69 0-113.44 45.79-128 91.2c-60 5.7-112 43.88-112 106.4s54 106.4 120 106.4h56"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m320 255.79l-64-64l-64 64m64 192.42V207.79"/></svg>';
var rawCreateOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48"/><path fill="currentColor" d="M459.94 53.25a16.06 16.06 0 0 0-23.22-.56L424.35 65a8 8 0 0 0 0 11.31l11.34 11.32a8 8 0 0 0 11.34 0l12.06-12c6.1-6.09 6.67-16.01.85-22.38M399.34 90L218.82 270.2a9 9 0 0 0-2.31 3.93L208.16 299a3.91 3.91 0 0 0 4.86 4.86l24.85-8.35a9 9 0 0 0 3.93-2.31L422 112.66a9 9 0 0 0 0-12.66l-9.95-10a9 9 0 0 0-12.71 0"/></svg>';
var rawContractOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M304 416V304h112m-101.8 10.23L432 432M208 96v112H96m101.8-10.23L80 80m336 128H304V96m10.23 101.8L432 80M96 304h112v112m-10.23-101.8L80 432"/></svg>';
var rawDocumentAttachOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M208 64h66.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62V432a48 48 0 0 1-48 48H192a48 48 0 0 1-48-48V304"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M288 72v120a32 32 0 0 0 32 32h120"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M160 80v152a23.69 23.69 0 0 1-24 24c-12 0-24-9.1-24-24V88c0-30.59 16.57-56 48-56s48 24.8 48 55.38v138.75c0 43-27.82 77.87-72 77.87s-72-34.86-72-77.87V144"/></svg>';
var rawDocumentOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 56v120a32 32 0 0 0 32 32h120"/></svg>';
var rawDocumentTextOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M416 221.25V416a48 48 0 0 1-48 48H144a48 48 0 0 1-48-48V96a48 48 0 0 1 48-48h98.75a32 32 0 0 1 22.62 9.37l141.26 141.26a32 32 0 0 1 9.37 22.62Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 56v120a32 32 0 0 0 32 32h120m-232 80h160m-160 80h160"/></svg>';
var rawDownloadOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336 176h40a40 40 0 0 1 40 40v208a40 40 0 0 1-40 40H136a40 40 0 0 1-40-40V216a40 40 0 0 1 40-40h40"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m176 272l80 80l80-80M256 48v288"/></svg>';
var rawEllipsisVertical = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><circle cx="256" cy="256" r="48" fill="currentColor"/><circle cx="256" cy="416" r="48" fill="currentColor"/><circle cx="256" cy="96" r="48" fill="currentColor"/></svg>';
var rawExpandOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320v112H320m101.8-10.23L304 304M80 192V80h112M90.2 90.23L208 208M320 80h112v112M421.77 90.2L304 208M192 432H80V320m10.23 101.8L208 304"/></svg>';
var rawFileTrayOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M384 80H128c-26 0-43 14-48 40L48 272v112a48.14 48.14 0 0 0 48 48h320a48.14 48.14 0 0 0 48-48V272l-32-152c-5-27-23-40-48-40Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M48 272h144m128 0h144m-272 0a64 64 0 0 0 128 0"/></svg>';
var rawFolderOpenOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M64 192v-72a40 40 0 0 1 40-40h75.89a40 40 0 0 1 22.19 6.72l27.84 18.56a40 40 0 0 0 22.19 6.72H408a40 40 0 0 1 40 40v40"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M479.9 226.55L463.68 392a40 40 0 0 1-39.93 40H88.25a40 40 0 0 1-39.93-40L32.1 226.55A32 32 0 0 1 64 192h384.1a32 32 0 0 1 31.8 34.55"/></svg>';
var rawInformationCircle = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M256 56C145.72 56 56 145.72 56 256s89.72 200 200 200s200-89.72 200-200S366.28 56 256 56m0 82a26 26 0 1 1-26 26a26 26 0 0 1 26-26m48 226h-88a16 16 0 0 1 0-32h28v-88h-16a16 16 0 0 1 0-32h32a16 16 0 0 1 16 16v104h28a16 16 0 0 1 0 32"/></svg>';
var rawMenuOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M80 160h352M80 256h352M80 352h352"/></svg>';
var rawNotificationsOffOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M128.51 204.59q-.37 6.15-.37 12.76C128.14 304 110 320 84.33 351.43C73.69 364.45 83 384 101.62 384H320m94.5-48.7c-18.48-23.45-30.62-47.05-30.62-118c0-79.3-40.52-107.57-73.88-121.3c-4.43-1.82-8.6-6-9.95-10.55C294.21 65.54 277.82 48 256 48s-38.2 17.55-44 37.47c-1.35 4.6-5.52 8.71-10 10.53a150 150 0 0 0-18 8.79M320 384v16a64 64 0 0 1-128 0v-16"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M448 448L64 64"/></svg>';
var rawOpenOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48M336 64h112v112M224 288L440 72"/></svg>';
var rawPlayOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M112 111v290c0 17.44 17 28.52 31 20.16l247.9-148.37c12.12-7.25 12.12-26.33 0-33.58L143 90.84c-14-8.36-31 2.72-31 20.16Z"/></svg>';
var rawRemove = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M400 256H112"/></svg>';
var rawSearchOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32" d="M221.09 64a157.09 157.09 0 1 0 157.09 157.09A157.1 157.1 0 0 0 221.09 64Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M338.29 338.29L448 448"/></svg>';
var rawSend = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="m476.59 227.05l-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52A24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4a24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8"/></svg>';
var rawSwapVerticalOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M464 208L352 96L240 208m112-94.87V416M48 304l112 112l112-112m-112 94V96"/></svg>';
var rawTrashOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m112 112l20 320c.95 18.49 14.4 32 32 32h184c17.67 0 30.87-13.51 32-32l20-320"/><path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M80 112h352"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M192 112V72h0a23.93 23.93 0 0 1 24-24h80a23.93 23.93 0 0 1 24 24h0v40m-64 64v224m-72-224l8 224m136-224l-8 224"/></svg>';
var rawTrendingDown = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M352 368h112V256"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m48 144l121.37 121.37a32 32 0 0 0 45.26 0l50.74-50.74a32 32 0 0 1 45.26 0L448 352"/></svg>';
var rawTrendingUp = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M352 144h112v112"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m48 368l121.37-121.37a32 32 0 0 1 45.26 0l50.74 50.74a32 32 0 0 0 45.26 0L448 160"/></svg>';
var rawVolumeHighOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M126 192H56a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h69.65a15.93 15.93 0 0 1 10.14 3.54l91.47 74.89A8 8 0 0 0 240 392V120a8 8 0 0 0-12.74-6.43l-91.47 74.89A15 15 0 0 1 126 192m194 128c9.74-19.38 16-40.84 16-64c0-23.48-6-44.42-16-64m48 176c19.48-33.92 32-64.06 32-112s-12-77.74-32-112m48 272c30-46 48-91.43 48-160s-18-113-48-160"/></svg>';
var rawVolumeLowOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M189.65 192H120a8 8 0 0 0-8 8v112a8 8 0 0 0 8 8h69.65a16 16 0 0 1 10.14 3.63l91.47 75a8 8 0 0 0 12.74-6.46V119.83a8 8 0 0 0-12.74-6.44l-91.47 75a16 16 0 0 1-10.14 3.61M384 320c9.74-19.41 16-40.81 16-64c0-23.51-6-44.4-16-64"/></svg>';
var rawVolumeMuteOutline = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M416 432L64 80"/><path fill="currentColor" d="M224 136.92v33.8a4 4 0 0 0 1.17 2.82l24 24a4 4 0 0 0 6.83-2.82v-74.15a24.53 24.53 0 0 0-12.67-21.72a23.91 23.91 0 0 0-25.55 1.83a8 8 0 0 0-.66.51l-31.94 26.15a4 4 0 0 0-.29 5.92l17.05 17.06a4 4 0 0 0 5.37.26Zm0 238.16l-78.07-63.92a32 32 0 0 0-20.28-7.16H64v-96h50.72a4 4 0 0 0 2.82-6.83l-24-24a4 4 0 0 0-2.82-1.17H56a24 24 0 0 0-24 24v112a24 24 0 0 0 24 24h69.76l91.36 74.8a8 8 0 0 0 .66.51a23.93 23.93 0 0 0 25.85 1.69A24.49 24.49 0 0 0 256 391.45v-50.17a4 4 0 0 0-1.17-2.82l-24-24a4 4 0 0 0-6.83 2.82ZM352 256c0-24.56-5.81-47.88-17.75-71.27a16 16 0 0 0-28.5 14.54C315.34 218.06 320 236.62 320 256q0 4-.31 8.13a8 8 0 0 0 2.32 6.25l19.66 19.67a4 4 0 0 0 6.75-2A147 147 0 0 0 352 256m64 0c0-51.19-13.08-83.89-34.18-120.06a16 16 0 0 0-27.64 16.12C373.07 184.44 384 211.83 384 256c0 23.83-3.29 42.88-9.37 60.65a8 8 0 0 0 1.9 8.26l16.77 16.76a4 4 0 0 0 6.52-1.27C410.09 315.88 416 289.91 416 256"/><path fill="currentColor" d="M480 256c0-74.26-20.19-121.11-50.51-168.61a16 16 0 1 0-27 17.22C429.82 147.38 448 189.5 448 256c0 47.45-8.9 82.12-23.59 113a4 4 0 0 0 .77 4.55L443 391.39a4 4 0 0 0 6.4-1C470.88 348.22 480 307 480 256"/></svg>';
var rawWarning = '<svg viewBox="0 0 512 512" width="1.2em" height="1.2em" ><path fill="currentColor" d="M449.07 399.08L278.64 82.58c-12.08-22.44-44.26-22.44-56.35 0L51.87 399.08A32 32 0 0 0 80 446.25h340.89a32 32 0 0 0 28.18-47.17m-198.6-1.83a20 20 0 1 1 20-20a20 20 0 0 1-20 20m21.72-201.15l-5.74 122a16 16 0 0 1-32 0l-5.74-121.95a21.73 21.73 0 0 1 21.5-22.69h.21a21.74 21.74 0 0 1 21.73 22.7Z"/></svg>';
function bake(svg) {
  return `data:image/svg+xml;utf8,${svg}`;
}
var iconAdd = bake(rawAdd);
var iconAlertCircle = bake(rawAlertCircle);
var iconAlertCircleOutline = bake(rawAlertCircleOutline);
var iconAppsOutline = bake(rawAppsOutline);
var iconArchiveOutline = bake(rawArchiveOutline);
var iconArrowRedoOutline = bake(rawArrowRedoOutline);
var iconArrowUndoOutline = bake(rawArrowUndoOutline);
var iconBackspaceOutline = bake(rawBackspaceOutline);
var iconCalendarOutline = bake(rawCalendarOutline);
var iconCheckmarkCircle = bake(rawCheckmarkCircle);
var iconCheckmarkOutline = bake(rawCheckmarkOutline);
var iconChevronBack = bake(rawChevronBack);
var iconChevronBackOutline = bake(rawChevronBackOutline);
var iconChevronDownOutline = bake(rawChevronDownOutline);
var iconChevronForward = bake(rawChevronForward);
var iconChevronForwardOutline = bake(rawChevronForwardOutline);
var iconChevronUpOutline = bake(rawChevronUpOutline);
var iconClose = bake(rawClose);
var iconCloseOutline = bake(rawCloseOutline);
var iconCloudUploadOutline = bake(rawCloudUploadOutline);
var iconCreateOutline = bake(rawCreateOutline);
var iconDocumentAttachOutline = bake(rawDocumentAttachOutline);
var iconContractOutline = bake(rawContractOutline);
var iconDocumentOutline = bake(rawDocumentOutline);
var iconDocumentTextOutline = bake(rawDocumentTextOutline);
var iconDownloadOutline = bake(rawDownloadOutline);
var iconEllipsisVertical = bake(rawEllipsisVertical);
var iconExpandOutline = bake(rawExpandOutline);
var iconFileTrayOutline = bake(rawFileTrayOutline);
var iconFolderOpenOutline = bake(rawFolderOpenOutline);
var iconInformationCircle = bake(rawInformationCircle);
var iconMenuOutline = bake(rawMenuOutline);
var iconNotificationsOffOutline = bake(rawNotificationsOffOutline);
var iconOpenOutline = bake(rawOpenOutline);
var iconPlayOutline = bake(rawPlayOutline);
var iconRemove = bake(rawRemove);
var iconSearchOutline = bake(rawSearchOutline);
var iconSend = bake(rawSend);
var iconSwapVerticalOutline = bake(rawSwapVerticalOutline);
var iconTrashOutline = bake(rawTrashOutline);
var iconTrendingDown = bake(rawTrendingDown);
var iconTrendingUp = bake(rawTrendingUp);
var iconVolumeHighOutline = bake(rawVolumeHighOutline);
var iconVolumeLowOutline = bake(rawVolumeLowOutline);
var iconVolumeMuteOutline = bake(rawVolumeMuteOutline);
var iconWarning = bake(rawWarning);
var BY_NAME = {
  "add": iconAdd,
  "alert-circle": iconAlertCircle,
  "alert-circle-outline": iconAlertCircleOutline,
  "apps-outline": iconAppsOutline,
  "archive-outline": iconArchiveOutline,
  "arrow-redo-outline": iconArrowRedoOutline,
  "arrow-undo-outline": iconArrowUndoOutline,
  "backspace-outline": iconBackspaceOutline,
  "calendar-outline": iconCalendarOutline,
  "checkmark-circle": iconCheckmarkCircle,
  "checkmark-outline": iconCheckmarkOutline,
  "chevron-back": iconChevronBack,
  "chevron-back-outline": iconChevronBackOutline,
  "chevron-down-outline": iconChevronDownOutline,
  "chevron-forward": iconChevronForward,
  "chevron-forward-outline": iconChevronForwardOutline,
  "chevron-up-outline": iconChevronUpOutline,
  "close": iconClose,
  "close-outline": iconCloseOutline,
  "cloud-upload-outline": iconCloudUploadOutline,
  "create-outline": iconCreateOutline,
  "document-attach-outline": iconDocumentAttachOutline,
  "contract-outline": iconContractOutline,
  "document-outline": iconDocumentOutline,
  "document-text-outline": iconDocumentTextOutline,
  "download-outline": iconDownloadOutline,
  "ellipsis-vertical": iconEllipsisVertical,
  "expand-outline": iconExpandOutline,
  "file-tray-outline": iconFileTrayOutline,
  "folder-open-outline": iconFolderOpenOutline,
  "information-circle": iconInformationCircle,
  "menu-outline": iconMenuOutline,
  "notifications-off-outline": iconNotificationsOffOutline,
  "open-outline": iconOpenOutline,
  "play-outline": iconPlayOutline,
  "remove": iconRemove,
  "search-outline": iconSearchOutline,
  "send": iconSend,
  "swap-vertical-outline": iconSwapVerticalOutline,
  "trash-outline": iconTrashOutline,
  "trending-down": iconTrendingDown,
  "trending-up": iconTrendingUp,
  "volume-high-outline": iconVolumeHighOutline,
  "volume-low-outline": iconVolumeLowOutline,
  "volume-mute-outline": iconVolumeMuteOutline,
  "warning": iconWarning
};
function okIcon(value) {
  if (!value) return void 0;
  const trimmed = value.trimStart();
  if (trimmed.startsWith("<svg")) return bake(trimmed);
  return BY_NAME[value] ?? value;
}

// @erplora/outfitkit/dist/ok-status-pill.js
var __defProp2 = Object.defineProperty;
var __decorateClass2 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp2(target, key, result);
  return result;
};
var OkStatusPill = class extends i3 {
  constructor() {
    super(...arguments);
    this.tone = "neutral";
    this.dot = false;
    this.size = "md";
  }
  static {
    this.styles = i`
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex.
         --tone-color (base: fondo/punto/icono) y --tone-shade (texto) se reasignan por tone abajo. */
      --tone-color: var(--ok-medium, var(--ion-color-medium, #5f5f5f));
      --tone-shade: var(--ok-medium, var(--ion-color-medium-shade, #545454));
      --background-opacity: var(--ok-pill-bg-opacity, 0.14);
      --border-radius: var(--ok-pill-radius, 999px);
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      /* Inline: el pill vive en celdas de tabla, cabeceras y listados. */
      display: inline-flex;
      vertical-align: middle;
      font-family: var(--font);
      box-sizing: border-box;
    }

    /* Mapa de tonos → color Ionic (base + shade para el texto). */
    :host([tone='success']) {
      --tone-color: var(--ok-success, var(--ion-color-success, #2dd55b));
      --tone-shade: var(--ok-success, var(--ion-color-success-shade, #28bb50));
    }
    :host([tone='warning']) {
      --tone-color: var(--ok-warning, var(--ion-color-warning, #ffc409));
      --tone-shade: var(--ok-warning-shade, var(--ion-color-warning-shade, #e0ac08));
    }
    :host([tone='danger']) {
      --tone-color: var(--ok-danger, var(--ion-color-danger, #c5000f));
      --tone-shade: var(--ok-danger, var(--ion-color-danger-shade, #ad000d));
    }
    :host([tone='info']) {
      --tone-color: var(--ok-info, var(--ion-color-secondary, #0163aa));
      --tone-shade: var(--ok-info, var(--ion-color-secondary-shade, #015896));
    }
    :host([tone='primary']) {
      --tone-color: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --tone-shade: var(--ok-primary, var(--ion-color-primary-shade, #3171e0));
    }
    /* neutral / sin tono → medium (default ya aplicado en :host). */

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4em;
      padding: 0.25em 0.7em;
      border-radius: var(--border-radius);
      /* Fondo tonal: el color del tono con baja opacidad. */
      background: color-mix(in srgb, var(--tone-color) calc(var(--background-opacity) * 100%), transparent);
      color: var(--ok-pill-color, var(--tone-shade));
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
    }
    :host([size='sm']) .pill {
      font-size: 0.72rem;
      padding: 0.2em 0.6em;
    }

    ion-icon {
      flex: 0 0 auto;
      font-size: 1.05em;
      pointer-events: none;
    }

    /* Punto de color (estilo Linear) en vez de icono. */
    .dot {
      flex: 0 0 auto;
      width: 0.5em;
      height: 0.5em;
      border-radius: 50%;
      background: var(--tone-color);
    }
  `;
  }
  render() {
    return b2`
      <span class="pill" part="pill">
        ${this.dot ? b2`<span class="dot" part="dot" aria-hidden="true"></span>` : this.icon ? b2`<ion-icon .icon=${okIcon(this.icon)} aria-hidden="true"></ion-icon>` : null}
        <slot>${this.label ?? ""}</slot>
      </span>
    `;
  }
};
__decorateClass2([
  n4({ type: String, reflect: true })
], OkStatusPill.prototype, "tone");
__decorateClass2([
  n4({ type: String })
], OkStatusPill.prototype, "label");
__decorateClass2([
  n4({ type: String })
], OkStatusPill.prototype, "icon");
__decorateClass2([
  n4({ type: Boolean, reflect: true })
], OkStatusPill.prototype, "dot");
__decorateClass2([
  n4({ type: String, reflect: true })
], OkStatusPill.prototype, "size");
define("ok-status-pill", OkStatusPill);

// @erplora/outfitkit/dist/ok-inline-feedback.js
var __defProp3 = Object.defineProperty;
var __decorateClass3 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp3(target, key, result);
  return result;
};
var DEFAULT_LABELS = {
  dismiss: "Dismiss"
};
var OkInlineFeedback = class extends i3 {
  constructor() {
    super(...arguments);
    this.tone = "info";
    this.dismissible = false;
    this.hidden = false;
    this.labels = {};
    this.hasActions = false;
    this.onActionsSlotChange = (e6) => {
      const slot = e6.target;
      this.hasActions = slot.assignedNodes({ flatten: true }).length > 0;
    };
  }
  static {
    this.styles = i`
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex.
         --tone-color y --tone-icon se reasignan por tone abajo. */
      --tone-color: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --background-opacity: 0.1;
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --border-radius: var(--ok-radius, var(--ion-border-radius, 8px));
      --padding: var(--ok-spacing, var(--ion-padding, 16px));
      --accent-width: 4px;
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      /* Responsive: el banner ocupa el ancho del contenedor. */
      display: block;
      width: 100%;
      font-family: var(--font);
      box-sizing: border-box;
    }
    :host([hidden]) { display: none; }

    /* Mapa de tonos → color Ionic + icono por defecto. */
    :host([tone='success']) { --tone-color: var(--ok-success, var(--ion-color-success, #2dd55b)); }
    :host([tone='warning']) { --tone-color: var(--ok-warning, var(--ion-color-warning, #ffc409)); }
    :host([tone='danger'])  { --tone-color: var(--ok-danger, var(--ion-color-danger, #c5000f)); }
    :host([tone='neutral']) { --tone-color: var(--ok-medium, var(--ion-color-medium, #5f5f5f)); }
    /* info / sin tono → primary (default ya aplicado en :host). */

    .box {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: var(--padding);
      border-radius: var(--border-radius);
      border-inline-start: var(--accent-width) solid var(--tone-color);
      /* Fondo tonal: el color del tono con baja opacidad (color-mix con fallback al borde fino). */
      background: color-mix(in srgb, var(--tone-color) calc(var(--background-opacity) * 100%), transparent);
      color: var(--color);
    }

    .icon {
      flex: 0 0 auto;
      font-size: 1.4rem;
      line-height: 1;
      color: var(--tone-color);
      margin-top: 0.05rem;
    }

    .content {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .row {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }
    .text {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .heading {
      font-weight: 700;
      font-size: 0.98rem;
      line-height: 1.3;
    }
    .body {
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .actions {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    /* Si no hay actions, el slot queda vacío y no ocupa espacio. */
    .actions.empty { display: none; }

    .close {
      flex: 0 0 auto;
      background: none;
      border: 0;
      cursor: pointer;
      padding: 0.15rem;
      margin: -0.15rem -0.15rem 0 0;
      color: inherit;
      opacity: 0.6;
      font-size: 1.2rem;
      line-height: 1;
      border-radius: 4px;
      transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease),
        border-color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease),
        opacity 0.15s ease, transform 120ms ease;
    }
    @media (hover: hover) {
      .close:hover { opacity: 1; background: rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.07); }
    }
    .close:active { transform: scale(var(--ok-press-scale, 0.97)); }

    /* Móvil: las actions bajan bajo el texto (apiladas a ancho completo). */
    @media (max-width: 640px) {
      .row { flex-direction: column; align-items: stretch; }
      .actions { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .close:hover,
      .close:active { transform: none; }
    }
  `;
  }
  // Textos efectivos: defaults en inglés + overrides del consumidor.
  get t() {
    return { ...DEFAULT_LABELS, ...this.labels };
  }
  // Icono por defecto según el tono (overridable por la prop `icon`).
  defaultIcon() {
    switch (this.tone) {
      case "success":
        return iconCheckmarkCircle;
      case "warning":
        return iconWarning;
      case "danger":
        return iconAlertCircle;
      case "neutral":
        return iconInformationCircle;
      case "info":
      default:
        return iconInformationCircle;
    }
  }
  // Oculta el banner y avisa al consumidor; éste puede revertir restaurando `hidden=false`.
  dismiss() {
    this.hidden = true;
    this.dispatchEvent(new CustomEvent("ok-dismiss", { bubbles: true, composed: true }));
  }
  render() {
    const iconName = this.icon ?? this.defaultIcon();
    return b2`
      <div class="box" role="status">
        <ion-icon class="icon" .icon=${okIcon(iconName)} aria-hidden="true"></ion-icon>
        <div class="content">
          <div class="row">
            <div class="text">
              ${this.heading ? b2`<div class="heading">${this.heading}</div>` : null}
              <div class="body"><slot></slot></div>
            </div>
            <div class="actions ${this.hasActions ? "" : "empty"}">
              <slot name="actions" @slotchange=${this.onActionsSlotChange}></slot>
            </div>
          </div>
        </div>
        ${this.dismissible ? b2`
              <button class="close" aria-label=${this.t.dismiss} @click=${this.dismiss}>
                <ion-icon .icon=${iconClose} aria-hidden="true"></ion-icon>
              </button>
            ` : null}
      </div>
    `;
  }
};
__decorateClass3([
  n4({ type: String, reflect: true })
], OkInlineFeedback.prototype, "tone");
__decorateClass3([
  n4({ type: String })
], OkInlineFeedback.prototype, "heading");
__decorateClass3([
  n4({ type: String })
], OkInlineFeedback.prototype, "icon");
__decorateClass3([
  n4({ type: Boolean, reflect: true })
], OkInlineFeedback.prototype, "dismissible");
__decorateClass3([
  n4({ type: Boolean, reflect: true })
], OkInlineFeedback.prototype, "hidden");
__decorateClass3([
  n4({ attribute: false })
], OkInlineFeedback.prototype, "labels");
__decorateClass3([
  r5()
], OkInlineFeedback.prototype, "hasActions");
define("ok-inline-feedback", OkInlineFeedback);

// @erplora/outfitkit/dist/ok-dropzone.js
var __defProp4 = Object.defineProperty;
var __decorateClass4 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp4(target, key, result);
  return result;
};
var DEFAULT_LABELS2 = {
  title: "Drag & drop files here or {browse}",
  browse: "browse",
  errorType: "\u201C{name}\u201D is not an accepted file type.",
  errorSize: "\u201C{name}\u201D exceeds the maximum size ({size}).",
  removeLabel: "Remove {name}"
};
var OkDropzone = class extends i3 {
  constructor() {
    super(...arguments);
    this.accept = "";
    this.multiple = false;
    this.labels = {};
    this.files = [];
    this.dragging = false;
    this.error = "";
  }
  static {
    this.styles = i`
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex */
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --color-muted: var(--ok-text-muted, rgba(var(--ion-text-color-rgb, 28, 27, 23), 0.55));
      --primary-color: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --primary-tint: var(--ok-primary-tint, var(--ion-color-primary-tint, #4c8dff));
      --danger-color: var(--ok-danger, var(--ion-color-danger, #c5000f));
      --border-color: var(--ok-border, rgba(var(--ion-text-color-rgb, 28, 27, 23), 0.22));
      --hover-bg: var(--ok-hover, rgba(var(--ion-text-color-rgb, 28, 27, 23), 0.04));
      --primary-bg: var(--ok-primary-soft, rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.08));
      --surface: var(--ok-surface, var(--ion-card-background, #ffffff));
      --border-radius: var(--ok-radius, 10px);
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      /* Responsive: ocupa el ancho del contenedor con un tope legible. */
      display: block;
      width: 100%;
      max-width: var(--ok-dropzone-max-width, 480px);
      color: var(--color);
      font-family: var(--font);
      font-size: 0.95rem;
    }
    .zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      box-sizing: border-box;
      width: 100%;
      padding: 1.5rem 1rem;
      text-align: center;
      border: 2px dashed var(--border-color);
      border-radius: var(--border-radius);
      background: var(--surface);
      cursor: pointer;
      transition: background-color var(--ok-transition, 150ms ease),
        color var(--ok-transition, 150ms ease),
        border-color var(--ok-transition, 150ms ease),
        box-shadow var(--ok-transition, 150ms ease), transform 120ms ease;
    }
    @media (hover: hover) {
      .zone:hover {
        background: var(--hover-bg);
      }
    }
    .zone:active {
      transform: scale(var(--ok-press-scale, 0.97));
    }
    /* Estado mientras se arrastra un fichero por encima. */
    .zone.dragging {
      border-color: var(--primary-color);
      background: var(--primary-bg);
    }
    @media (prefers-reduced-motion: reduce) {
      .zone:active,
      .file .remove:active {
        transform: none;
      }
    }
    .zone .big-icon {
      font-size: 2rem;
      color: var(--primary-color);
    }
    .zone .title {
      font-weight: 600;
    }
    .zone .title .link {
      color: var(--primary-color);
      text-decoration: underline;
    }
    .zone .hint {
      font-size: 0.82rem;
      color: var(--color-muted);
    }
    /* Lista de archivos elegidos. */
    .files {
      list-style: none;
      margin: 0.7rem 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .file {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-sizing: border-box;
      padding: 0.4rem 0.6rem;
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      background: var(--surface);
    }
    .file .file-icon {
      flex: 0 0 auto;
      font-size: 1.15rem;
      color: var(--color-muted);
    }
    .file .meta {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .file .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .file .size {
      font-size: 0.78rem;
      color: var(--color-muted);
    }
    .file .remove {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      /* Toca el mínimo táctil entero (#92): va solo al final de la fila, con 0.5rem de aire antes,
         así que crecer solo hace la fila un poco más alta — y en táctil ese botón es como se
         deshace un fichero metido por error. */
      width: var(--ok-tap-min, 44px);
      height: var(--ok-tap-min, 44px);
      padding: 0;
      border: 0;
      background: none;
      color: var(--color-muted);
      cursor: pointer;
      border-radius: 50%;
      transition: background-color var(--ok-transition, 150ms ease),
        color var(--ok-transition, 150ms ease),
        border-color var(--ok-transition, 150ms ease),
        box-shadow var(--ok-transition, 150ms ease), transform 120ms ease;
    }
    @media (hover: hover) {
      .file .remove:hover {
        background: var(--hover-bg);
        color: var(--danger-color);
      }
    }
    .file .remove:active {
      transform: scale(var(--ok-press-scale, 0.97));
    }
    /* Error inline (tipo/tamaño no admitido). */
    .error {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.5rem;
      color: var(--danger-color);
      font-size: 0.82rem;
    }
    input[type='file'] {
      display: none;
    }
  `;
  }
  // Textos efectivos: defaults inglés sobreescritos por los pasados desde fuera.
  get t() {
    return { ...DEFAULT_LABELS2, ...this.labels };
  }
  // Formatea bytes a una etiqueta legible (B, KB, MB…).
  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes / 1024;
    let i7 = 0;
    while (value >= 1024 && i7 < units.length - 1) {
      value /= 1024;
      i7 += 1;
    }
    return `${value.toFixed(value >= 10 || i7 === 0 ? 0 : 1)} ${units[i7]}`;
  }
  // Comprueba si un archivo casa con `accept` (extensiones, mime exacto o `tipo/*`).
  matchesAccept(file) {
    if (!this.accept.trim()) return true;
    const tokens = this.accept.split(",").map((t5) => t5.trim().toLowerCase()).filter(Boolean);
    const name = file.name.toLowerCase();
    const mime = file.type.toLowerCase();
    return tokens.some((token) => {
      if (token.startsWith(".")) return name.endsWith(token);
      if (token.endsWith("/*")) return mime.startsWith(token.slice(0, -1));
      return mime === token;
    });
  }
  // Emite `ok-error` con el mensaje dado y lo guarda para mostrarlo inline.
  reportError(message) {
    this.error = message;
    this.dispatchEvent(
      new CustomEvent("ok-error", {
        detail: { message },
        bubbles: true,
        composed: true
      })
    );
  }
  // Emite `ok-change` con la lista actual de archivos válidos.
  emitChange() {
    this.dispatchEvent(
      new CustomEvent("ok-change", {
        detail: { files: this.files },
        bubbles: true,
        composed: true
      })
    );
  }
  // Procesa un FileList (de input o de drop), valida y añade los aceptados.
  ingest(list) {
    if (!list || !list.length) return;
    this.error = "";
    const incoming = Array.from(list);
    const next = this.multiple ? [...this.files] : [];
    for (const file of incoming) {
      if (!this.matchesAccept(file)) {
        this.reportError(this.t.errorType.replace("{name}", file.name));
        continue;
      }
      if (this.maxSize != null && file.size > this.maxSize) {
        this.reportError(
          this.t.errorSize.replace("{name}", file.name).replace("{size}", this.formatSize(this.maxSize))
        );
        continue;
      }
      const dup = next.some((f3) => f3.name === file.name && f3.size === file.size);
      if (!dup) next.push(file);
      if (!this.multiple) break;
    }
    this.files = next;
    this.emitChange();
  }
  // Quita un archivo de la lista por índice y re-emite el cambio.
  removeAt(index) {
    this.files = this.files.filter((_2, i7) => i7 !== index);
    this.error = "";
    this.emitChange();
  }
  openPicker() {
    this.input?.click();
  }
  onInputChange(e6) {
    const target = e6.target;
    this.ingest(target.files);
    target.value = "";
  }
  onDragOver(e6) {
    e6.preventDefault();
    this.dragging = true;
  }
  onDragLeave(e6) {
    e6.preventDefault();
    this.dragging = false;
  }
  onDrop(e6) {
    e6.preventDefault();
    this.dragging = false;
    this.ingest(e6.dataTransfer?.files ?? null);
  }
  render() {
    const [titleBefore, titleAfter = ""] = this.t.title.split("{browse}");
    return b2`
      <div
        class=${`zone ${this.dragging ? "dragging" : ""}`.trim()}
        role="button"
        tabindex="0"
        @click=${this.openPicker}
        @keydown=${(e6) => {
      if (e6.key === "Enter" || e6.key === " ") {
        e6.preventDefault();
        this.openPicker();
      }
    }}
        @dragover=${this.onDragOver}
        @dragleave=${this.onDragLeave}
        @drop=${this.onDrop}
      >
        <ion-icon class="big-icon" .icon=${iconCloudUploadOutline}></ion-icon>
        <span class="title">
          ${titleBefore}<span class="link">${this.t.browse}</span>${titleAfter}
        </span>
        ${this.hint ? b2`<span class="hint">${this.hint}</span>` : ""}
      </div>

      <input
        type="file"
        ?multiple=${this.multiple}
        accept=${this.accept || ""}
        @change=${this.onInputChange}
      />

      ${this.error ? b2`<div class="error"><ion-icon .icon=${iconAlertCircleOutline}></ion-icon>${this.error}</div>` : ""}

      ${this.files.length ? b2`<ul class="files">
            ${this.files.map(
      (file, i7) => b2`<li class="file">
                <ion-icon class="file-icon" .icon=${iconDocumentOutline}></ion-icon>
                <span class="meta">
                  <span class="name">${file.name}</span>
                  <span class="size">${this.formatSize(file.size)}</span>
                </span>
                <button
                  type="button"
                  class="remove"
                  aria-label=${this.t.removeLabel.replace("{name}", file.name)}
                  @click=${(e6) => {
        e6.stopPropagation();
        this.removeAt(i7);
      }}
                >
                  <ion-icon .icon=${iconCloseOutline}></ion-icon>
                </button>
              </li>`
    )}
          </ul>` : ""}
    `;
  }
};
__decorateClass4([
  n4()
], OkDropzone.prototype, "accept");
__decorateClass4([
  n4({ type: Boolean })
], OkDropzone.prototype, "multiple");
__decorateClass4([
  n4({ type: Number, attribute: "max-size" })
], OkDropzone.prototype, "maxSize");
__decorateClass4([
  n4()
], OkDropzone.prototype, "hint");
__decorateClass4([
  n4({ attribute: false })
], OkDropzone.prototype, "labels");
__decorateClass4([
  r5()
], OkDropzone.prototype, "files");
__decorateClass4([
  r5()
], OkDropzone.prototype, "dragging");
__decorateClass4([
  r5()
], OkDropzone.prototype, "error");
__decorateClass4([
  e4('input[type="file"]')
], OkDropzone.prototype, "input");
define("ok-dropzone", OkDropzone);

// ui/lib/core-fetch.ts
var HUB_SESSION_KEY = "erplora.hub_session";
var MODULE_HEADER = "X-Erplora-Module";
var MODULE_ID = "verifactu";
function hubSession() {
  try {
    return globalThis.localStorage?.getItem(HUB_SESSION_KEY) ?? null;
  } catch {
    return null;
  }
}
function headersFor(opts) {
  const headers = { [MODULE_HEADER]: MODULE_ID };
  const session = hubSession();
  if (session) headers["X-Hub-Session"] = session;
  if (opts.json !== void 0) headers["Content-Type"] = "application/json";
  return headers;
}
function initFor(opts) {
  return {
    method: opts.method ?? (opts.json !== void 0 || opts.form ? "POST" : "GET"),
    headers: headersFor(opts),
    credentials: "same-origin",
    ...opts.form ? { body: opts.form } : {},
    ...opts.json !== void 0 ? { body: JSON.stringify(opts.json) } : {}
  };
}
async function jsonBody(res) {
  try {
    const parsed = await res.json();
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
async function coreFetch(path, opts = {}) {
  let res;
  try {
    res = await fetch(path, initFor(opts));
  } catch {
    return { ok: false, status: 0, body: {} };
  }
  return { ok: res.ok, status: res.status, body: await jsonBody(res) };
}
async function coreFetchBlob(path, json) {
  let res;
  try {
    res = await fetch(path, initFor({ method: "POST", json }));
  } catch {
    return { ok: false, status: 0, body: {}, blob: null };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, body: await jsonBody(res), blob: null };
  }
  return { ok: true, status: res.status, body: {}, blob: await res.blob() };
}

// ui/lib/representation-grant.ts
var GRANT_PATH = "/api/fiscal/representation-grant";
var GRANT_MODEL_PATH = "/api/fiscal/representation-grant/model";
var RepresentationGrantError = class extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = "RepresentationGrantError";
    this.code = code;
    this.statusCode = statusCode;
  }
};
function failure(where, status, body) {
  const code = typeof body.error === "string" ? body.error : void 0;
  const statusCode = typeof body.status_code === "number" ? body.status_code : void 0;
  return new RepresentationGrantError(`${where} \u2192 ${status}`, code, statusCode);
}
var str = (v3) => typeof v3 === "string" ? v3 : "";
var num = (v3) => typeof v3 === "number" && Number.isFinite(v3) && v3 > 0 ? Math.floor(v3) : 0;
var flag = (v3) => v3 === true;
function documentsOf(v3) {
  const o7 = v3 && typeof v3 === "object" ? v3 : {};
  return {
    signed_document: flag(o7.signed_document),
    dni_copy: flag(o7.dni_copy),
    signature_sample: flag(o7.signature_sample),
    representation_proof: flag(o7.representation_proof)
  };
}
function historyOf(v3) {
  if (!Array.isArray(v3)) return [];
  return v3.filter((e6) => !!e6 && typeof e6 === "object").map((e6) => ({
    version: num(e6.version),
    status: str(e6.status),
    submitted_at: str(e6.submitted_at),
    reviewed_at: str(e6.reviewed_at),
    rejected_reason: str(e6.rejected_reason),
    superseded: flag(e6.superseded)
  }));
}
async function getGrant() {
  const reply = await coreFetch(GRANT_PATH);
  if (!reply.ok) throw failure("get-representation-grant", reply.status, reply.body);
  return {
    status: str(reply.body.status),
    at: str(reply.body.at),
    rejected_reason: str(reply.body.rejected_reason),
    signature_kind: str(reply.body.signature_kind),
    document_type: str(reply.body.document_type),
    version: num(reply.body.version),
    submitted_at: str(reply.body.submitted_at),
    reviewed_at: str(reply.body.reviewed_at),
    documents: documentsOf(reply.body.documents),
    history: historyOf(reply.body.history)
  };
}
async function downloadGrantModel(fields) {
  const reply = await coreFetchBlob(GRANT_MODEL_PATH, fields);
  if (!reply.ok || !reply.blob) {
    throw failure("representation-grant-model", reply.status, reply.body);
  }
  return reply.blob;
}
async function postGrant(capture) {
  const form = new FormData();
  form.append("obligado_nif", capture.obligado_nif);
  form.append("obligado_name", capture.obligado_name);
  form.append("signer_nif", capture.signer_nif);
  form.append("signer_name", capture.signer_name);
  form.append("document_type", capture.document_type);
  form.append("signed_document", capture.signed_document, capture.signed_document.name);
  form.append("dni_copy", capture.dni_copy, capture.dni_copy.name);
  if (capture.signature_sample) {
    form.append("signature_sample", capture.signature_sample, capture.signature_sample.name);
  }
  if (capture.representation_proof) {
    form.append(
      "representation_proof",
      capture.representation_proof,
      capture.representation_proof.name
    );
  }
  const reply = await coreFetch(GRANT_PATH, { method: "POST", form });
  if (!reply.ok) throw failure("post-representation-grant", reply.status, reply.body);
  return { status: str(reply.body.status), at: str(reply.body.at) };
}

// locales/es.json
var es_default = {
  name: "VeriFactu",
  description: "Cumplimiento de VeriFactu en Espa\xF1a: firma y remite los registros de facturaci\xF3n a la AEAT, con cola de contingencia.",
  navigation: {
    records: {
      label: "Registros"
    },
    contingency: {
      label: "Contingencia"
    },
    events: {
      label: "Eventos"
    },
    recovery: {
      label: "Recuperaci\xF3n"
    },
    config: {
      label: "Configuraci\xF3n"
    },
    settings: {
      label: "Ajustes"
    }
  },
  ui: {
    loading: "Cargando\u2026",
    colWhen: "Cu\xE1ndo",
    colSeverity: "Severidad",
    colType: "Tipo",
    colMessage: "Mensaje",
    sevDebug: "Depuraci\xF3n",
    sevInfo: "Informaci\xF3n",
    sevWarning: "Aviso",
    sevError: "Error",
    sevCritical: "Cr\xEDtico",
    evtType: {
      record_created: "Registro creado",
      invoice_type_downgraded: "Tipo de factura cambiado",
      transmission_deferred: "Env\xEDo aplazado",
      transmission_success: "Env\xEDo aceptado",
      transmission_warning: "Aceptado con avisos",
      transmission_failure: "Env\xEDo fallido",
      contingency_processed: "Cola de contingencia procesada",
      chain_validated: "Cadena verificada",
      chain_error: "Cadena rota",
      aeat_queried: "Consulta a la AEAT",
      chain_recovered: "Cadena recuperada",
      diagnostic: "Prueba de conexi\xF3n"
    },
    eventsTitle: "Eventos de auditor\xEDa",
    eventsSearchPlaceholder: "Buscar tipo o mensaje\u2026",
    eventsEmpty: "Sin eventos.",
    eventsWidgetError: "No se han podido cargar los \xFAltimos eventos de la AEAT.",
    evt: {
      record_created: "Registro {record_type} #{sequence_number} de la factura {invoice_number} sellado",
      invoice_type_downgraded: "La factura {invoice_number} se declar\xF3 {declared} y se ha registrado como {effective}: sin NIF de destinatario la AEAT rechaza el tipo declarado (error 1189)",
      xsd_invalid: "XML no conforme al esquema de la AEAT; no se ha transmitido: {validation_error}",
      transmission_retry: "Fallo de transmisi\xF3n AEAT ({environment}) tras {attempts} intento(s); se reintenta en {backoff_minutes} min",
      not_transmitted: "No se ha transmitido a la AEAT tras {attempts} intento(s): {error}",
      aeat_verdict: "AEAT ({environment}): env\xEDo {estado_envio}, registro {estado_registro}",
      contingency_processed: "Cola de contingencia procesada: {successful} enviados, {failed} con error",
      diagnostic_ran: "Prueba VeriFactu ejecutada contra {environment} con la factura de muestra {sample_number}",
      diagnostic_certificate_invalid: "Prueba VeriFactu contra {environment}: el certificado no es v\xE1lido \u2014 {cert_message}",
      diagnostic_gateway_unavailable: "Prueba VeriFactu contra {environment}: ERPlora no puede remitir por ti ahora mismo \u2014 {cert_message}",
      diagnostic_issuer_nif_missing: "Prueba VeriFactu contra {environment}: falta el NIF del obligado tributario \u2014 config\xFAralo en Ajustes \u2192 Negocio antes de probar la conexi\xF3n",
      diagnostic_sample_record_invalid: "Prueba VeriFactu contra {environment}: tu configuraci\xF3n no produce un registro de prueba v\xE1lido \u2014 {cert_message}",
      chain_validated: "Cadena de huellas \xEDntegra: {total} registro(s) con su encadenado SHA-256 verificado ({issuer_nif}). No se re-auditan los importes",
      chain_broken: "Cadena de huellas ROTA en la secuencia {first_invalid_seq} ({issuer_nif})",
      aeat_queried: "Consulta AEAT: {count} registro(s) recuperados para {issuer_nif}",
      chain_recovered_from_aeat: "Cadena recuperada desde la AEAT para {issuer_nif}: contin\xFAa en la secuencia {sequence_number} de {found} registro(s) encontrados",
      chain_continued_manually: "Cadena continuada manualmente para {issuer_nif}: contin\xFAa en la secuencia {sequence_number}",
      reason: {
        certificate_unavailable: "el fichero del certificado no se ha podido cargar: comprueba en Ajustes \u2192 Negocio que est\xE1 subido y que su contrase\xF1a es la correcta",
        no_transmission_route: "este hub todav\xEDa no tiene por d\xF3nde presentar: no tiene certificado propio ni conexi\xF3n con la pasarela fiscal de ERPlora",
        gateway_not_ready: "la pasarela fiscal de ERPlora no puede presentar ahora mismo ({detail})",
        gateway_not_ready_unspecified: "la pasarela fiscal de ERPlora no puede presentar ahora mismo y no ha dicho por qu\xE9",
        gateway_unreachable: "no se ha podido contactar con la pasarela fiscal de ERPlora; int\xE9ntalo de nuevo en unos minutos",
        producer_facts_missing: "este hub todav\xEDa no ha recibido de ERPlora los datos del productor del software; llegan solos la pr\xF3xima vez que se sincronice",
        sample_envelope_invalid: "el registro de prueba no se ha podido construir con los ajustes de este hub",
        certificate_loaded: "el certificado se ha cargado correctamente",
        gateway_ready: "la pasarela fiscal de ERPlora est\xE1 disponible y presenta por ti",
        issuer_nif_missing: "configura el NIF del obligado tributario (emisor) en Ajustes \u2192 Negocio antes de probar la conexi\xF3n",
        sample_record_schema_invalid: "el esquema de la AEAT ha rechazado el registro de prueba: {detail}",
        schema_envelope_empty: "el registro a presentar ha salido vac\xEDo; no es XML v\xE1lido",
        schema_envelope_not_regfactu: "el sobre no es una presentaci\xF3n VeriFactu (RegFactuSistemaFacturacion)",
        schema_record_missing: "el sobre no lleva ning\xFAn registro de factura",
        schema_header_issuer_missing: "la presentaci\xF3n no lleva obligado tributario: configura los datos fiscales del negocio en Ajustes \u2192 Negocio",
        schema_issuer_identity_incomplete: "los datos fiscales del negocio est\xE1n incompletos: {element} es obligatorio y viene vac\xEDo",
        schema_representative_incomplete: "los datos del representante est\xE1n incompletos: {element} es obligatorio",
        schema_element_out_of_order: "{element} va fuera de orden; el esquema de la AEAT espera {sequence}",
        schema_element_missing: "{element} es obligatorio y no est\xE1 en el registro",
        schema_element_missing_or_empty: "{element} es obligatorio y falta o viene vac\xEDo",
        schema_element_empty: "{element} es obligatorio y viene vac\xEDo",
        schema_value_not_in_enum: "{element} vale \xAB{value}\xBB, que el esquema de la AEAT no admite; solo acepta {allowed}",
        schema_value_too_long: "{element} vale \xAB{value}\xBB, m\xE1s largo que los {max} caracteres que admite la AEAT",
        schema_recipient_block_required: "una factura {invoice_type} tiene que identificar al cliente; una venta sin NIF de cliente es un tique simplificado F2",
        schema_hash_type_unsupported: "el tipo de huella \xAB{value}\xBB no est\xE1 soportado; la AEAT solo admite 01 (SHA-256)",
        schema_hash_malformed: "la huella del registro no es un SHA-256 v\xE1lido (64 caracteres hexadecimales)",
        aeat_tls_rejected: "la AEAT no ha aceptado el certificado al abrir el canal seguro; comprueba que no est\xE9 caducado ni revocado",
        aeat_unreachable: "no se ha podido contactar con la AEAT; int\xE9ntalo de nuevo en unos minutos",
        schema_rectification_field_on_plain_invoice: "una factura {invoice_type} no rectifica nada, as\xED que no puede informar {element}; la AEAT solo lo admite con tipo de factura {allowed}",
        schema_rectification_type_missing: "una rectificativa {invoice_type} exige TipoRectificativa ({allowed}); sin \xE9l la AEAT rechaza el registro, que ya ha gastado su n\xFAmero de cadena",
        schema_rectification_amount_required: "una rectificativa por sustituci\xF3n (TipoRectificativa=S) exige ImporteRectificacion con la base y la cuota rectificadas",
        schema_rectification_amount_not_allowed: "una rectificativa por diferencias (TipoRectificativa=I) ya declara el delta en sus propios importes; ImporteRectificacion solo se informa con TipoRectificativa=S",
        schema_breakdown_empty: "el desglose no lleva ninguna l\xEDnea DetalleDesglose: la AEAT no admite un desglose vac\xEDo",
        schema_breakdown_too_many_lines: "el desglose lleva {count} l\xEDneas y el esquema admite {max}",
        schema_breakdown_value_not_in_enum: "l\xEDnea {line} del desglose: {element} vale \xAB{value}\xBB, que no est\xE1 en la enumeraci\xF3n; solo acepta {allowed}",
        schema_breakdown_regime_not_in_enum: "l\xEDnea {line} del desglose: ClaveRegimen \xAB{value}\xBB no est\xE1 en las listas L8A/L8B de la AEAT",
        schema_breakdown_regime_not_allowed: "l\xEDnea {line} del desglose: ClaveRegimen solo se admite con impuesto {allowed}, y esta l\xEDnea declara {tax}",
        schema_breakdown_regime_required: "l\xEDnea {line} del desglose: ClaveRegimen es obligatoria con impuesto {tax}; sin ella la AEAT responde el error 1245",
        schema_breakdown_regime_requires_n2: "l\xEDnea {line} del desglose: ClaveRegimen {regime} exige CalificacionOperacion N2 y lleva \xAB{qualification}\xBB",
        schema_breakdown_qualification_conflict: "l\xEDnea {line} del desglose: CalificacionOperacion y OperacionExenta son un choice del esquema \u2014 va una o la otra, nunca las dos",
        schema_breakdown_qualification_missing: "l\xEDnea {line} del desglose: falta CalificacionOperacion u OperacionExenta; el esquema exige una de las dos",
        schema_breakdown_exemption_igic_only: "l\xEDnea {line} del desglose: OperacionExenta \xAB{value}\xBB solo existe con impuesto 03 (IGIC); con IVA la lista es E1\u2013E6",
        schema_breakdown_base_missing: "l\xEDnea {line} del desglose: {element} es obligatorio",
        schema_breakdown_exempt_amount_not_allowed: "l\xEDnea {line} del desglose: una l\xEDnea con OperacionExenta no puede informar {element}",
        schema_breakdown_untaxed_amount_not_allowed: "l\xEDnea {line} del desglose: con CalificacionOperacion \xAB{qualification}\xBB la l\xEDnea no puede informar {element}; es el error 1237 de la AEAT",
        schema_breakdown_reverse_charge_not_zero: "l\xEDnea {line} del desglose: con inversi\xF3n del sujeto pasivo (S2) {element} tiene que ser 0 y vale {value}",
        schema_breakdown_reverse_charge_missing: "l\xEDnea {line} del desglose: con inversi\xF3n del sujeto pasivo (S2) {element} es obligatorio y va a 0 \u2014 no se omite",
        schema_breakdown_vat_rate_not_allowed: "l\xEDnea {line} del desglose: TipoImpositivo {value} no es un tipo de IVA; la AEAT solo admite 0, 2, 4, 5, 7,5, 10 y 21",
        schema_breakdown_surcharge_rate_not_allowed: "l\xEDnea {line} del desglose: TipoRecargoEquivalencia {value} no es un tipo de recargo de equivalencia; la AEAT admite 0, 0,26, 0,5, 0,62, 1, 1,4, 1,75 y 5,2",
        schema_simplified_over_ceiling: "una factura simplificada F2 no puede pasar de {ceiling} (m\xE1s {tolerance} de tolerancia) sumando base y cuota de todas las l\xEDneas, y esta suma {total}; con este importe hay que emitir factura completa identificando al destinatario",
        earlier_records_pending: "antes tiene que salir un registro anterior de la misma cadena, porque a la AEAT se env\xEDan en orden"
      },
      transmission_deferred: "A\xFAn no se ha enviado a la AEAT: {why}"
    },
    colSeq: "Seq",
    colInvoice: "Factura",
    colDate: "Fecha",
    colInvoiceType: "F.",
    colIssuer: "Emisor",
    colTotal: "Total",
    colStatus: "Estado",
    recTypeAlta: "Alta",
    recTypeAnulacion: "Anulaci\xF3n",
    statusPending: "Pendiente",
    statusTransmitted: "Transmitido",
    statusAccepted: "Aceptado",
    statusRejected: "Rechazado",
    statusError: "Error",
    statusRetry: "Reintento",
    recordsTitle: "Registros VeriFactu",
    recordsSearchPlaceholder: "Buscar factura, emisor o NIF\u2026",
    recordsEmpty: "Sin registros VeriFactu.",
    recordsEmptyNoInvoices: "Todav\xEDa no has emitido ninguna factura. Cada factura que emitas se sella y aparece aqu\xED.",
    recordsNotSealingTitle: "La cadena no est\xE1 sellando",
    recordsNotSealing: "Este hub ha emitido {count} factura(s) y tiene 0 registros VeriFactu. No est\xE1n llegando a la AEAT, y la ley obliga a que lleguen.",
    recordsNotSealingGrant: "Revisar permisos",
    recordsNotSealingEvents: "Ver eventos ca\xEDdos",
    recordsSealingUnknown: "No hay registros y no se ha podido leer cu\xE1ntas facturas se han emitido, as\xED que no se puede saber si la cadena est\xE1 sellando. P\xEDdele a un administrador que lo compruebe.",
    colRecord: "Registro",
    colPriority: "Prioridad",
    colAttempts: "Intentos",
    colNextAttempt: "Pr\xF3ximo intento",
    colLastError: "\xDAltimo error",
    contingencyTitle: "Cola de contingencia",
    processQueue: "Procesar cola",
    processing: "Procesando\u2026",
    contingencySearchPlaceholder: "Buscar registro o estado\u2026",
    contingencyEmpty: "Cola vac\xEDa.",
    actionRetry: "Reintentar",
    actionCancel: "Cancelar",
    errProcessQueue: "No se pudo procesar la cola",
    errRetry: "No se pudo reencolar",
    errCancel: "No se pudo cancelar",
    errCancelRequiredRecord: "No se puede descartar: el registro a\xFAn no est\xE1 registrado en la AEAT. Reintenta la transmisi\xF3n.",
    errGoLiveIsOneWay: "No se puede volver al modo de pruebas: este hub ya envi\xF3 a la AEAT un registro aceptado en producci\xF3n. Para hacer pruebas, usa otro hub (uno gratuito o la demo).",
    settingsTitle: "Configuraci\xF3n VeriFactu",
    settingsSaved: "Configuraci\xF3n guardada correctamente.",
    errLoadConfig: "Error cargando la configuraci\xF3n",
    errSaveConfig: "No se pudo guardar la configuraci\xF3n",
    enableVerifactu: "Activar VeriFactu",
    envAeat: "Entorno AEAT",
    envTesting: "Pruebas (AEAT Test)",
    envProduction: "Producci\xF3n",
    goLiveAction: "Pasar a producci\xF3n",
    goLiveHint: "Tus facturas van al entorno de pruebas de la AEAT. Cuando est\xE9 todo listo, pasa a producci\xF3n: ERPlora comprueba antes que no falte nada.",
    goLiveConfirmTitle: "\xBFEnviar tus facturas a la AEAT de verdad?",
    goLiveConfirmMessage: "A partir de ahora cada factura se remite a la AEAT real. Solo podr\xE1s volver a pruebas hasta que se remita la primera.",
    goLiveDone: "Tu hub est\xE1 en producci\xF3n: las facturas ya se remiten a la AEAT real.",
    goLiveDemoHint: "Este es un hub de demostraci\xF3n: siempre remite al entorno de pruebas de la AEAT. Crea tu propio hub para pasar a producci\xF3n.",
    goLiveOneWayHint: "Tu hub ya ha remitido facturas a la AEAT real, as\xED que no puede volver a pruebas. Para hacer pruebas, usa otro hub.",
    standDownAction: "Volver a pruebas",
    standDownHint: "Todav\xEDa no se ha remitido ninguna factura a la AEAT real, as\xED que a\xFAn puedes volver a pruebas.",
    standDownConfirmTitle: "\xBFVolver al entorno de pruebas?",
    standDownConfirmMessage: "Las facturas volver\xE1n a ir al entorno de pruebas de la AEAT y no contar\xE1n ante Hacienda.",
    standDownDone: "Tu hub ha vuelto al entorno de pruebas.",
    errGoLive: "No se ha podido pasar a producci\xF3n. Int\xE9ntalo de nuevo en un momento.",
    errGoLiveStateUnavailable: "No se ha podido comprobar si este hub env\xEDa en pruebas o en producci\xF3n. Revisa la conexi\xF3n y reint\xE9ntalo.",
    errGoLiveNeedsGrant: "Para pasar a producci\xF3n, ERPlora necesita tu autorizaci\xF3n firmada para remitir en tu nombre, aprobada por nuestro equipo. F\xEDrmala en Configuraci\xF3n.",
    errGoLiveNotReady: "Tu hub a\xFAn no est\xE1 listo para producci\xF3n: faltan tus datos fiscales o una v\xEDa para remitir (tu propio certificado o el de ERPlora). Revisa Configuraci\xF3n.",
    errGoLiveDemo: "Este es un hub de demostraci\xF3n y no puede pasar a producci\xF3n. Crea tu propio hub para facturar de verdad.",
    errGoLiveCertificateExpired: "Tu certificado propio ha caducado y la AEAT no lo acepta. Sube uno renovado, o deja que remita ERPlora, y vuelve a intentarlo.",
    errGoLiveClosed: "Este hub ces\xF3 su actividad y ya no emite facturas.",
    softwareNif: "NIF del software / emisor",
    softwareName: "Nombre del software",
    softwareId: "ID del software",
    softwareVersion: "Versi\xF3n del software",
    certificatePath: "Ruta del certificado (.p12)",
    certificatePathPlaceholder: "/ruta/al/certificado.p12",
    save: "Guardar configuraci\xF3n",
    saving: "Guardando\u2026",
    certPkcs12: "Certificado PKCS#12 (.p12 / .pfx)",
    certChoose: "Elegir archivo\u2026",
    testTitle: "Prueba en vivo",
    testHint: "Verifica el certificado y hace un env\xEDo de PRUEBA a la AEAT. No afecta a la cadena real ni a tus facturas.",
    testRun: "Enviar prueba",
    testRunning: "Enviando\u2026",
    testCreateInvoice: "Crear factura de prueba",
    testCreateInvoiceRunning: "Creando\u2026",
    testInvoiceCreated: "Factura de prueba creada \u2014 verla en Facturaci\xF3n.",
    testInvoiceTestingOnly: "Solo disponible en el entorno de pruebas y con el NIF del emisor configurado.",
    testType: "Tipo de prueba",
    testTypeTicket: "Tiquet simplificado (F2)",
    testTypeInvoice: "Factura completa (F1, cliente de prueba)",
    certExpiry: "Caducidad del certificado",
    certExpiryHint: "Se extrae autom\xE1ticamente del certificado al guardarlo.",
    certDaysRemaining: "d\xEDas restantes",
    certExpired: "El certificado ha caducado. Renu\xE9valo para poder enviar a la AEAT.",
    testNoRun: "A\xFAn no has ejecutado ninguna prueba. Guarda el certificado y pulsa \xABEnviar prueba\xBB.",
    testCert: "Certificado",
    testHuella: "Huella de muestra (SHA-256)",
    testAeatLink: "Enlace de verificaci\xF3n en la AEAT",
    testAeatLinkGo: "Validar en la Agencia Tributaria \u2197",
    testQrNote: "Escanea para validar la factura en la AEAT",
    testAeatResp: "Respuesta de la AEAT",
    testAeatAccepted: "Aceptado por la AEAT",
    testAeatNotSent: "No se intent\xF3 el env\xEDo (revisa el certificado).",
    testAeatNotSentDelegated: "No se ha remitido nada, y en esta v\xEDa eso es lo correcto: un registro remitido no se puede deshacer, as\xED que ERPlora comprueba la v\xEDa en vez de usarla.",
    testAeatError: "Error de env\xEDo a la AEAT",
    testEnv: "Entorno",
    producerTitle: "Identificaci\xF3n del software",
    producerInfo: "Datos del fabricante del software, fijos y declarados a la AEAT en cada registro.",
    producerNif: "NIF del productor",
    producerName: "Nombre / Raz\xF3n social del productor",
    obligadoNif: "NIF del obligado tributario (emisor)",
    obligadoName: "Nombre / raz\xF3n social del emisor",
    obligadoHint: "Empresa/aut\xF3nomo que emite las facturas. La AEAT lo valida y debe coincidir con el titular del certificado.",
    obligadoFromHub: "Se toma de la identidad fiscal del negocio en Ajustes \u2192 Negocio. Es la fuente \xFAnica del hub: aqu\xED se muestra y all\xED se cambia.",
    obligadoMissing: "sin configurar",
    certLoaded: "cargado \u2713",
    certNotConfigured: "no configurado",
    certHubHint: "El certificado fiscal se configura en Ajustes \u2192 Negocio (es un recurso del hub, no de este m\xF3dulo).",
    certGoSettings: "Ir a Ajustes",
    routeTitle: "Env\xEDo a la Agencia Tributaria",
    routeOwn: "con mi propio certificado",
    routeDelegated: "lo hace ERPlora por ti",
    routeLoading: "consultando\u2026",
    routeUnknown: "no disponible",
    routeUnknownHint: "Este hub todav\xEDa no publica la v\xEDa de env\xEDo. Actual\xEDzalo para verla aqu\xED; mientras tanto la pantalla solo informa de si tienes cargado un certificado propio.",
    routeOwnHint: "Firmas y env\xEDas con tu certificado; no hace falta ning\xFAn otorgamiento a ERPlora.",
    routeDelegatedHint: "ERPlora remite tus registros de facturaci\xF3n a la Agencia Tributaria en tu nombre, con su propio certificado. Tu otorgamiento firmado es lo que se lo permite.",
    grantTitle: "Otorgamiento de representaci\xF3n",
    grantVigente: "aprobado",
    grantPendiente: "en revisi\xF3n",
    grantRechazado: "devuelto",
    grantRevocado: "revocado",
    grantAbsent: "sin firmar",
    grantSince: "\xDAltima actualizaci\xF3n",
    grantHint: "Se firma en Ajustes \u2192 Negocio, donde ERPlora te prepara el modelo oficial y lo revisa una persona. Solo con el otorgamiento aprobado puede tu negocio pasar a producci\xF3n.",
    certNotNeeded: "no hace falta en esta v\xEDa",
    certOptionalHint: "En esta v\xEDa no necesitas certificado propio: ERPlora remite con el suyo. Sube uno solo si prefieres enviar t\xFA directamente.",
    testNeedsGatewayIdentity: "Conecta este hub con ERPlora ah\xED arriba para poder ejecutar la prueba en vivo.",
    testRoute: "Se remite",
    testGatewayReady: "ERPlora puede remitir por ti",
    testGatewayNotReady: "ERPlora no puede remitir por ti ahora mismo",
    testNeedsOwnCertificate: "Sube el certificado del negocio en Ajustes \u2192 Negocio para poder ejecutar la prueba en vivo.",
    gatewayTitle: "Conexi\xF3n segura con ERPlora",
    gatewayHint: "Para que ERPlora pueda remitir a la Agencia Tributaria en tu nombre, este hub y ERPlora se identifican con un certificado de este equipo. La clave privada se crea aqu\xED y nunca sale.",
    gatewayCommonName: "Identificador de este hub",
    gatewayValidUntil: "V\xE1lida hasta",
    gwLoading: "consultando\u2026",
    gwUnknown: "no disponible",
    gwAbsent: "sin solicitar",
    gwPending: "pendiente de firma",
    gwActive: "activa",
    gwExpiring: "caduca pronto",
    gwExpired: "caducada",
    gwUnknownHint: "No hemos podido preguntarle a este hub por su conexi\xF3n. Recarga la pantalla; si sigue pasando, el hub no est\xE1 respondiendo.",
    gwAbsentHint: "Solic\xEDtala y ERPlora la prepara. Una persona de ERPlora la revisa y la firma, normalmente en 24-72 horas.",
    gwPendingHint: "Ya est\xE1 solicitada. Falta que una persona de ERPlora la firme, normalmente en 24-72 horas; el hub la recoge solo en cuanto ocurra.",
    gwExpiringHint: "Renu\xE9vala antes de que caduque: mientras est\xE9 caducada, ERPlora no puede remitir en tu nombre.",
    gwExpiredHint: "ERPlora no puede remitir en tu nombre hasta que la renueves. Mientras tanto, tus registros esperan en la cola de contingencia.",
    gwEnrol: "Solicitar la conexi\xF3n",
    gwCheck: "Comprobar el estado",
    gwRenew: "Renovar la conexi\xF3n",
    gwWorking: "Trabajando\u2026",
    gwFiled: "Solicitada. Una persona de ERPlora la revisa y la firma, normalmente en 24-72 horas.",
    gwAwaitingReview: "Ya estaba solicitada y sigue en revisi\xF3n. Aqu\xED no hay nada m\xE1s que hacer.",
    gwInstalled: "Conexi\xF3n activa. ERPlora ya puede remitir en tu nombre.",
    gwRejected: "ERPlora ha devuelto la solicitud.",
    gwOutOfBudget: "Demasiadas comprobaciones en una hora. El hub sigue intent\xE1ndolo solo; vuelve en unos minutos.",
    gwOutcomeUnknown: "ERPlora ha contestado algo que esta pantalla no sabe leer. Comun\xEDcaselo al soporte.",
    gwErrNoMachineCredential: "Este hub todav\xEDa no ha terminado de conectarse con ERPlora, as\xED que a\xFAn no puede solicitar nada. Int\xE9ntalo en unos minutos.",
    gwErrCsrUnavailable: "Este hub no ha podido preparar la solicitud. Comun\xEDcaselo al soporte.",
    gwErrCloudUnreachable: "No hemos podido contactar con ERPlora. El hub sigue intent\xE1ndolo solo; prueba otra vez en unos minutos.",
    gwErrNotInstallable: "ERPlora ha firmado la conexi\xF3n pero este hub no ha podido instalarla. Comun\xEDcaselo al soporte con el c\xF3digo de abajo.",
    gwErrRefused: "ERPlora ha rechazado la solicitud. El c\xF3digo de abajo dice por qu\xE9.",
    gwErrNotAdmin: "Solo un administrador del hub puede solicitar esta conexi\xF3n.",
    gwErrHttp: "El hub no ha respondido a la solicitud. Vuelve a intentarlo en un momento.",
    capabilityTitle: "Permiso: Certificado del negocio (firma fiscal)",
    capabilityPending: "se concede en Permisos",
    capabilityDenied: "sin conceder",
    capabilityHint: "VeriFactu firma y remite con el certificado del negocio, y el hub solo se lo presta a un m\xF3dulo que el due\xF1o haya autorizado. Se concede una vez en Ajustes \u2192 Permisos, y viene APAGADO en cualquier hub cuyos m\xF3dulos no entraran por el di\xE1logo de consentimiento de Apps (un blueprint, la API o una importaci\xF3n).",
    capabilityGoPermissions: "Ir a Permisos",
    enabledNeedsPermission: "VeriFactu est\xE1 activado. Para que pueda firmar y remitir, el permiso \xABCertificado del negocio (firma fiscal)\xBB tiene que estar concedido en Ajustes \u2192 Permisos.",
    errCapabilityDenied: "VeriFactu no tiene permiso para firmar: falta conceder \xABCertificado del negocio (firma fiscal)\xBB. Conc\xE9delo en Ajustes \u2192 Permisos y vuelve a intentarlo.",
    recoveryTitle: "Recuperaci\xF3n de cadena",
    recChainStatus: "Integridad de la cadena",
    recValidate: "Validar cadena",
    recValidating: "Validando\u2026",
    recChainValid: "Cadena de huellas \xEDntegra \u2713",
    recChainBroken: "Cadena de huellas ROTA \u2717",
    recChainUnknown: "Sin validar todav\xEDa",
    recChainScope: "Recalcula las huellas SHA-256 y verifica el encadenado. No vuelve a auditar los importes: la base, la cuota y el total se comprueban antes de sellar el registro, y una vez encadenado son inmutables.",
    recAeatTitle: "\xDAltimos registros en la AEAT",
    recConsultAeat: "Consultar AEAT",
    recConsulting: "Consultando\u2026",
    recAeatEmpty: "Sin datos de la AEAT. Pulsa \xABConsultar AEAT\xBB.",
    recColHuella: "Huella",
    recColCsv: "CSV",
    recColEstado: "Estado",
    recRecoverFromAeat: "Recuperar cadena desde la AEAT",
    recRecovering: "Recuperando\u2026",
    recManualTitle: "Continuar cadena manualmente (migraci\xF3n)",
    recManualHint: "Pega la \xFAltima huella (64 hex) de tu aplicaci\xF3n anterior para continuar la misma concatenaci\xF3n.",
    recManualNif: "NIF del emisor",
    recManualHash: "\xDAltima huella (64 hex)",
    recManualInvoice: "N\xBA de factura (opcional)",
    recManualDate: "Fecha (YYYY-MM-DD, opcional)",
    recRecoverManual: "Continuar desde esta huella",
    recCancel: "Cancelar",
    recConfirmAeatTitle: "Recuperar la cadena desde la AEAT",
    recConfirmAeatMessage: "Se reconstruir\xE1 la continuidad local desde el \xFAltimo registro disponible en la AEAT. Verifica el NIF del emisor antes de continuar.",
    recConfirmManualTitle: "Continuar la cadena desde una huella externa",
    recConfirmManualMessage: "La huella indicada ser\xE1 el antecedente del pr\xF3ximo registro fiscal. Usa esta opci\xF3n \xFAnicamente durante una migraci\xF3n y despu\xE9s de verificar el dato de origen.",
    recConfirmAction: "Confirmar recuperaci\xF3n",
    recDone: "Operaci\xF3n completada.",
    recErrValidate: "No se pudo validar la cadena",
    recErrConsult: "No se pudo consultar a la AEAT",
    recErrRecover: "No se pudo recuperar la cadena",
    recErrHash: "La huella debe tener 64 caracteres hexadecimales",
    errIssuerRequired: "No se puede activar VeriFactu sin obligado tributario: configura antes el NIF y la raz\xF3n social en Ajustes \u2192 Negocio.",
    errDemoEnvironmentLocked: "Este es un hub de demostraci\xF3n: siempre declara al entorno de pruebas de la AEAT, as\xED que no se puede pasar a producci\xF3n. Todo lo dem\xE1s funciona \u2014 los registros se encadenan y cada uno tiene su tique y su QR. Para facturar de verdad, crea tu propio hub.",
    errDemoCertificateLocked: "Este es un hub de demostraci\xF3n: no puede tener certificado propio del negocio, porque la AEAT no emite ninguno ficticio. ERPlora remite tus registros a la Agencia Tributaria en tu nombre, siempre contra el entorno de pruebas. Para usar el tuyo, crea tu propio hub.",
    errDemoIdentityLocked: "Este es un hub de demostraci\xF3n: su NIF y su raz\xF3n social son fijos y no se pueden editar, porque los documentos que emite no son de nadie. Para facturar con tu propio NIF, crea tu propio hub.",
    errTestRun: "No se pudo ejecutar la prueba",
    errTestInvoice: "No se pudo crear la factura de prueba",
    back: "Volver",
    errRecordNotFound: "Registro no encontrado",
    errLoadDetail: "No se pudo cargar el registro",
    detailTitle: "Registro {number}",
    fieldGeneratedAt: "Generado el",
    fieldTransmittedAt: "Transmitido el",
    chainSectionTitle: "Cadena de huellas",
    fieldPreviousHash: "Huella anterior",
    deliveryFingerprintTitle: "Huella de la entrega",
    fieldTransmissionId: "ID de transmisi\xF3n",
    fieldXmlSha256: "Digest del XML (SHA-256)",
    fieldXmlStoragePath: "Fichero XML",
    fingerprintNotStamped: "A\xFAn sin estampar",
    aeatSectionTitle: "Respuesta de la AEAT",
    fieldAeatResponseCode: "C\xF3digo de respuesta",
    fieldAeatResponseMessage: "Mensaje de respuesta",
    fieldRetryCount: "Reintentos",
    fieldNextRetryAt: "Pr\xF3ximo reintento",
    pendingTitle: "A\xFAn no est\xE1 en la AEAT",
    pendingWhenNextSend: "Sale solo en el pr\xF3ximo env\xEDo autom\xE1tico \u2014cada 5 minutos, en cuanto este hub pueda enviar\u2014, en orden y declarado a la AEAT como env\xEDo tard\xEDo. No tienes que hacer nada.",
    pendingWhenQueued: "Est\xE1 en la cola de contingencia y sale solo en su pr\xF3ximo intento, {at}, en orden y declarado a la AEAT como env\xEDo tard\xEDo. No tienes que hacer nada.",
    pendingWhyUnknown: "No sali\xF3 al crearse.",
    pendingWhyUnavailable: "No se ha podido cargar el motivo.",
    fieldQrUrl: "QR",
    fieldQrUrlLink: "Abrir QR",
    declTitle: "Declaraci\xF3n responsable",
    declDesc: "La declaraci\xF3n que ERPlora firma para la versi\xF3n del sistema que est\xE1s usando, y los datos identificativos que cada factura env\xEDa a Hacienda. Si alguna vez te los piden, esta es la pantalla que se ense\xF1a.",
    declRead: "Leer la declaraci\xF3n firmada",
    declTextVersion: "Versi\xF3n de la declaraci\xF3n",
    declDataTitle: "Datos identificativos de este sistema",
    declPending: "Los datos identificativos de ERPlora todav\xEDa no han llegado. Llegan solos al minuto de estar el sistema en marcha; hasta entonces no se puede enviar ninguna factura a Hacienda.",
    declError: "No se ha podido cargar la declaraci\xF3n responsable.",
    declNombreRazon: "Productor",
    declNIF: "NIF del productor",
    declNombreSistemaInformatico: "Nombre del sistema",
    declIdSistemaInformatico: "C\xF3digo del sistema",
    declVersion: "Versi\xF3n instalada",
    declNumeroInstalacion: "N\xFAmero de instalaci\xF3n",
    declTipoUsoPosibleSoloVerifactu: "Solo VERI*FACTU",
    declTipoUsoPosibleMultiOT: "Puede dar servicio a varios obligados",
    declIndicadorMultiplesOT: "Da servicio a varios obligados",
    cfgTitle: "Configuraci\xF3n de VeriFactu",
    cfgOwnTitle: "Usar mi propio certificado",
    cfgOwnOffHint: "ERPlora remite tus registros de facturaci\xF3n a Hacienda en tu nombre, con su propio certificado. No necesitas ninguno.",
    cfgOwnOnHint: "Env\xEDas t\xFA directamente a Hacienda con el certificado de tu negocio. No sale de este hub en ning\xFAn momento.",
    cfgOwnOffKeptHint: "Tu certificado sigue guardado en este hub, pero ahora remite ERPlora en tu nombre, con su propio certificado. Enci\xE9ndelo para volver a usar el tuyo.",
    routeSwitchedOwn: "Listo: a partir de ahora env\xEDas con tu propio certificado.",
    routeSwitchedDelegated: "Listo: a partir de ahora remite ERPlora en tu nombre. Tu certificado sigue guardado.",
    errRouteNeedsGrant: "Para que ERPlora remita en producci\xF3n falta que aprobemos tu otorgamiento de representaci\xF3n. Mientras tanto sigues enviando con tu certificado.",
    errRouteNeedsConnection: "Para que ERPlora remita falta que firmemos la conexi\xF3n segura de este hub. Mientras tanto sigues enviando con tu certificado.",
    errRouteNeedsCertificate: "No hay ning\xFAn certificado subido: s\xFAbelo en Configuraci\xF3n para poder usarlo.",
    errRouteSwitch: "No se ha podido cambiar la v\xEDa de env\xEDo. No ha cambiado nada; int\xE9ntalo de nuevo.",
    cfgP12Title: "Certificado del negocio (.p12 / .pfx)",
    cfgP12Present: "Cargado",
    cfgP12Absent: "Sin cargar",
    cfgP12Holder: "Titular",
    cfgP12Uploaded: "Subido el",
    cfgP12Hint: "El fichero y su contrase\xF1a los guarda el hub, y no vuelven a esta pantalla nunca m\xE1s.",
    cfgP12Password: "Contrase\xF1a del certificado",
    cfgP12Upload: "Subir certificado",
    cfgP12Uploading: "Subiendo\u2026",
    cfgP12Uploaded2: "Certificado subido",
    cfgP12NoFile: "Elige antes un fichero .p12 o .pfx.",
    cfgP12Error: "No se ha podido guardar el certificado. Revisa el fichero y la contrase\xF1a.",
    cfgP12Denied: "Esta app no tiene permiso para usar el certificado del negocio. Conc\xE9delo en Ajustes \u2192 Permisos.",
    cfgP12Removed: "Certificado quitado. ERPlora vuelve a remitir en tu nombre.",
    cfgRemoveTitle: "Esto quita tu certificado",
    cfgRemoveHint: "Al apagarlo se borra el certificado de este hub y vuelve a remitir ERPlora en tu nombre. Puedes volver a subirlo cuando quieras.",
    cfgRemoveConfirm: "Quitarlo",
    cfgRemoveCancel: "Dejarlo",
    cfgDelegatedTitle: "Lo remite ERPlora por ti",
    cfgDelegatedHint: "Tu otorgamiento firmado es lo que se lo permite. Sin \xE9l, el negocio no puede pasar a producci\xF3n.",
    cfgDelegatedGrant: "Otorgamiento",
    cfgDelegatedGoDocuments: "Ir a Documentaci\xF3n",
    cfgGrantTitle: "Otorgamiento de representaci\xF3n",
    cfgGrantHint: "Te descargas el modelo oficial ya relleno con tus datos, lo firmas fuera de esta pantalla y lo vuelves a subir. Lo revisa una persona de ERPlora.",
    cfgGrantAt: "Firmado el",
    grantDownloaded: "Modelo descargado. F\xEDrmalo y s\xFAbelo aqu\xED abajo.",
    cfgGoConfig: "Abrir Configuraci\xF3n",
    cfgTabDelegated: "Lo remite ERPlora",
    cfgTabOwn: "Mi certificado",
    grantBusinessMissingTitle: "Faltan datos de tu negocio",
    grantBusinessMissingHint: "El modelo oficial se rellena con el NIF, la raz\xF3n social y el domicilio fiscal de Ajustes \u2192 Negocio. Compl\xE9talos all\xED para que el modelo firmado coincida con tus facturas.",
    grantBusinessFix: "Completar datos del negocio",
    dropTitle: "Arrastra aqu\xED el fichero o {browse}",
    dropBrowse: "el\xEDgelo",
    dropErrorType: "\xAB{name}\xBB no es de un tipo admitido.",
    dropErrorSize: "\xAB{name}\xBB pesa m\xE1s de {size}.",
    dropRemove: "Quitar {name}",
    cfgP12Choose: "Certificado del negocio (.p12 o .pfx)"
  },
  widgets: {
    "verifactu.pending": {
      title: "Pendientes VeriFactu",
      label: "Registros pendientes de env\xEDo a la AEAT"
    },
    "verifactu.contingency": {
      title: "Cola de contingencia",
      label: "En cola de contingencia"
    },
    "verifactu.by_status": {
      title: "Registros por estado"
    },
    "verifactu.events": {
      title: "Eventos AEAT recientes"
    }
  },
  setup: {
    title: "Configura VeriFactu",
    description: "Activa VeriFactu y sube el certificado del negocio para enviar tus facturas a la AEAT."
  },
  grant: {
    intro: "ERPlora remite tus registros de facturaci\xF3n a la Agencia Tributaria EN TU NOMBRE. La ley exige tu consentimiento firmado: el modelo oficial del acuerdo de colaboraci\xF3n social. Lo descargas, lo firmas fuera de esta pantalla y lo vuelves a subir.",
    stateVigente: "Aprobado el {date}. ERPlora puede remitir en tu nombre.",
    statePendiente: "Subido el {date}. Lo estamos revisando y te avisamos por email en 24-72 horas.",
    stateRejected: "Devuelto el {date}. Corrige lo que se indica abajo y vuelve a subirlo.",
    stateRevoked: "Revocado el {date}. ERPlora no puede remitir en tu nombre.",
    stateAbsent: "Sin firmar. Tu negocio no puede pasar a producci\xF3n hasta que lo firmes.",
    stateUnknown: "Consultando con ERPlora\u2026",
    stateUnreachable: "No hemos podido contactar con ERPlora, as\xED que no podemos decirte c\xF3mo va.",
    step1Title: "1 \xB7 Consigue el modelo oficial",
    step1Hint: "Te lo rellenamos con tus datos. Su texto lo fija la Agencia Tributaria y no se puede modificar.",
    step2Title: "2 \xB7 Sube el modelo firmado",
    step2Hint: "Lo revisa una persona de ERPlora y te avisa por email en 24-72 horas.",
    municipio: "Municipio",
    via: "V\xEDa p\xFAblica",
    numero: "N\xFAmero",
    signerNif: "NIF/NIE de quien firma",
    signerName: "Nombre y apellidos de quien firma",
    downloadModel: "Descargar el modelo",
    howToByHand: "A mano: impr\xEDmelo, f\xEDrmalo, ponle el sello de la entidad si tu negocio es una sociedad, y escan\xE9alo a PDF.",
    howToElectronic: "Electr\xF3nicamente: firma el PDF con AutoFirma usando tu propio certificado cualificado. Una firma dibujada no vale.",
    privacyTitle: "Protecci\xF3n de datos \u2014 informaci\xF3n b\xE1sica (art. 13 RGPD)",
    privacyController: "Responsable: ERPLORA CLOUD SL (B27593136). Custodiamos estos documentos como representante tuyo.",
    privacyPurpose: "Finalidad y base: remitir en tu nombre los registros de facturaci\xF3n a la Agencia Tributaria, al amparo del otorgamiento que firmas y de nuestras obligaciones legales. Los conservamos mientras dure la representaci\xF3n y durante los plazos tributarios.",
    documentType: "Documento de identidad",
    documentTypeDni: "DNI",
    documentTypeNie: "NIE",
    signedDocumentChoose: "Adjuntar el modelo firmado (PDF)",
    dniChoose: "Adjuntar copia del documento de identidad",
    signatureSampleWhy: "Muchos NIE no llevan firma impresa, as\xED que necesitamos una hoja con tu firma manuscrita para poder compararla.",
    signatureSampleChoose: "Adjuntar muestra de firma",
    representationProofWhy: "Tu negocio es una sociedad, as\xED que necesitamos el documento que acredita qui\xE9n puede firmar por ella.",
    representationProofChoose: "Adjuntar el justificante de representaci\xF3n",
    submit: "Enviar a revisi\xF3n",
    preferComputer: "Prefiero hacerlo desde el ordenador",
    partyLegalRepresentative: "Representante legal",
    partyLegalRepresentativeHint: "La persona que firma en nombre de la sociedad, tal como la nombra su escritura. La copia del documento de identidad que se sube abajo es la suya.",
    privacyRights: "Tus derechos: acceso, rectificaci\xF3n, supresi\xF3n, oposici\xF3n y portabilidad en privacy@erplora.com.",
    errors: {
      obligado_nif_required: "Tu negocio necesita un NIF antes de poder hacer esto.",
      signer_required: "Rellena el nombre y el NIF de quien firma.",
      document_type_invalid: "Elige el tipo de documento de identidad.",
      signed_document_required: "Adjunta el modelo firmado.",
      signed_document_not_pdf: "El modelo firmado tiene que ser un PDF \u2014 escan\xE9alo o f\xEDrmalo con AutoFirma.",
      dni_copy_required: "Adjunta una copia del documento de identidad.",
      signature_sample_required: "Con NIE necesitamos adem\xE1s una muestra de tu firma manuscrita.",
      representation_proof_required: "Adjunta el documento que acredita que puedes firmar por la sociedad.",
      document_too_large: "Cada fichero tiene que ocupar menos de 10 MB.",
      invalid_via: "Esa v\xEDa no es una por la que podamos remitir.",
      cloud_rejected: "ERPlora no ha podido atenderlo ahora mismo. Int\xE9ntalo en unos minutos.",
      hub_not_enrolled: "Este hub todav\xEDa no est\xE1 conectado con ERPlora.",
      identity_not_shared: "No hemos podido decirle a ERPlora qui\xE9n es el obligado. Si la p\xE1gina te pide tus datos fiscales, gu\xE1rdalos otra vez en Ajustes \u2192 Negocio.",
      open_external_failed: "No hemos podido abrir tu navegador.",
      unknown: "No ha funcionado. Vuelve a intentarlo."
    },
    submittedTitle: "Lo que has enviado",
    submittedOn: "Env\xEDo n.\xBA {n}, enviado el {date}",
    reviewedOn: "Revisado el {date}",
    docSignedDocument: "Modelo firmado",
    docDniCopy: "Copia del documento de identidad",
    docSignatureSample: "Muestra de firma",
    docRepresentationProof: "Justificante de representaci\xF3n",
    historyTitle: "Historial de env\xEDos",
    historyRow: "N.\xBA {n} \xB7 {date}",
    historyPending: "En revisi\xF3n",
    historyInForce: "Aceptado: vigente",
    historyRejected: "Rechazado",
    historyRevoked: "Revocado",
    historyReplaced: "Sustituido por un env\xEDo nuevo",
    resend: "Volver a enviar",
    resendCancel: "Cancelar",
    resendHintPending: "Si algo sali\xF3 mal, env\xEDalo de nuevo: el env\xEDo nuevo sustituye al que est\xE1 en revisi\xF3n.",
    resendHintInForce: "Mientras revisamos el env\xEDo nuevo, sigues remitiendo con el actual."
  }
};

// locales/en.json
var en_default = {
  name: "VeriFactu",
  navigation: {
    records: {
      label: "Records"
    },
    contingency: {
      label: "Contingency"
    },
    events: {
      label: "Events"
    },
    recovery: {
      label: "Recovery"
    },
    config: {
      label: "Configuration"
    },
    settings: {
      label: "Settings"
    }
  },
  ui: {
    loading: "Loading\u2026",
    colWhen: "When",
    colSeverity: "Severity",
    colType: "Type",
    colMessage: "Message",
    sevDebug: "Debug",
    sevInfo: "Info",
    sevWarning: "Warning",
    sevError: "Error",
    sevCritical: "Critical",
    evtType: {
      record_created: "Record created",
      invoice_type_downgraded: "Invoice type changed",
      transmission_deferred: "Submission postponed",
      transmission_success: "Submission accepted",
      transmission_warning: "Accepted with warnings",
      transmission_failure: "Submission failed",
      contingency_processed: "Contingency queue processed",
      chain_validated: "Chain verified",
      chain_error: "Chain broken",
      aeat_queried: "AEAT query",
      chain_recovered: "Chain recovered",
      diagnostic: "Connection test"
    },
    eventsTitle: "Audit events",
    eventsSearchPlaceholder: "Search type or message\u2026",
    eventsEmpty: "No events.",
    eventsWidgetError: "Couldn't load the latest AEAT events.",
    evt: {
      record_created: "{record_type} record #{sequence_number} sealed for invoice {invoice_number}",
      invoice_type_downgraded: "Invoice {invoice_number} was declared {declared} and registered as {effective}: without a recipient tax ID the AEAT rejects the declared type (error 1189)",
      xsd_invalid: "XML does not conform to the AEAT schema, so it was not transmitted: {validation_error}",
      transmission_retry: "AEAT transmission failed ({environment}) after {attempts} attempt(s); retrying in {backoff_minutes} min",
      not_transmitted: "Not transmitted to the AEAT after {attempts} attempt(s): {error}",
      aeat_verdict: "AEAT ({environment}): submission {estado_envio}, record {estado_registro}",
      contingency_processed: "Contingency queue processed: {successful} sent, {failed} failed",
      diagnostic_ran: "VeriFactu test run against {environment} with sample invoice {sample_number}",
      diagnostic_certificate_invalid: "VeriFactu test against {environment}: the certificate is not valid \u2014 {cert_message}",
      diagnostic_gateway_unavailable: "VeriFactu test against {environment}: ERPlora cannot file for you right now \u2014 {cert_message}",
      diagnostic_issuer_nif_missing: "VeriFactu test against {environment}: the taxpayer (issuer) tax ID is missing \u2014 set it in Settings \u2192 Business before testing the connection",
      diagnostic_sample_record_invalid: "VeriFactu test against {environment}: your configuration does not produce a valid test record \u2014 {cert_message}",
      chain_validated: "Fingerprint chain intact: {total} record(s) with their SHA-256 chaining verified ({issuer_nif}). Amounts are not re-audited",
      chain_broken: "Fingerprint chain BROKEN at sequence {first_invalid_seq} ({issuer_nif})",
      aeat_queried: "AEAT query: {count} record(s) retrieved for {issuer_nif}",
      chain_recovered_from_aeat: "Chain recovered from the AEAT for {issuer_nif}: continues at sequence {sequence_number} of {found} record(s) found",
      chain_continued_manually: "Chain continued manually for {issuer_nif}: continues at sequence {sequence_number}",
      reason: {
        certificate_unavailable: "the certificate file could not be loaded: check in Settings \u2192 Business that it is uploaded and that its password is correct",
        no_transmission_route: "this hub has no way to file yet: it has neither a certificate of its own nor a connection to ERPlora's fiscal gateway",
        gateway_not_ready: "ERPlora's fiscal gateway cannot file right now ({detail})",
        gateway_not_ready_unspecified: "ERPlora's fiscal gateway cannot file right now and did not say why",
        gateway_unreachable: "ERPlora's fiscal gateway could not be reached; try again in a few minutes",
        producer_facts_missing: "this hub has not received its software-producer details from ERPlora yet; they arrive on their own the next time it syncs",
        sample_envelope_invalid: "the test record could not be built from this hub's settings",
        certificate_loaded: "the certificate loaded correctly",
        gateway_ready: "ERPlora's fiscal gateway is available and files on your behalf",
        issuer_nif_missing: "set the taxpayer (issuer) tax ID in Settings \u2192 Business before testing the connection",
        sample_record_schema_invalid: "the AEAT schema refused the test record: {detail}",
        schema_envelope_empty: "the record to be filed came out empty; it is not valid XML",
        schema_envelope_not_regfactu: "the envelope is not a VeriFactu filing (RegFactuSistemaFacturacion)",
        schema_record_missing: "the envelope carries no invoice record at all",
        schema_header_issuer_missing: "the filing carries no taxpayer: set your business tax details in Settings \u2192 Business",
        schema_issuer_identity_incomplete: "your business tax details are incomplete: {element} is required and came in empty",
        schema_representative_incomplete: "the filing agent's details are incomplete: {element} is required",
        schema_element_out_of_order: "{element} is filed out of order; the AEAT schema expects {sequence}",
        schema_element_missing: "{element} is required and is not in the record",
        schema_element_missing_or_empty: "{element} is required and is either missing or empty",
        schema_element_empty: "{element} is required and came in empty",
        schema_value_not_in_enum: "{element} is \xAB{value}\xBB, which the AEAT schema does not admit; it only takes {allowed}",
        schema_value_too_long: "{element} is \xAB{value}\xBB, longer than the {max} characters the AEAT admits",
        schema_recipient_block_required: "a {invoice_type} invoice has to identify the customer; a sale with no customer tax ID is a simplified F2 receipt",
        schema_hash_type_unsupported: "the hash type \xAB{value}\xBB is not supported; the AEAT only takes 01 (SHA-256)",
        schema_hash_malformed: "the record hash is not a valid SHA-256 (64 hexadecimal characters)",
        aeat_tls_rejected: "the AEAT did not accept the certificate when opening the secure channel; check that it has not expired and has not been revoked",
        aeat_unreachable: "the AEAT could not be reached; try again in a few minutes",
        schema_rectification_field_on_plain_invoice: "a {invoice_type} invoice rectifies nothing, so it cannot carry {element}; the AEAT only admits it with invoice type {allowed}",
        schema_rectification_type_missing: "a {invoice_type} corrective invoice requires TipoRectificativa ({allowed}); without it the AEAT refuses the record, which has already spent its chain number",
        schema_rectification_amount_required: "a corrective invoice by substitution (TipoRectificativa=S) requires ImporteRectificacion with the corrected base and tax",
        schema_rectification_amount_not_allowed: "a corrective invoice by difference (TipoRectificativa=I) already declares the delta in its own amounts; ImporteRectificacion is only filed with TipoRectificativa=S",
        schema_breakdown_empty: "the breakdown carries no DetalleDesglose line: the AEAT does not admit an empty breakdown",
        schema_breakdown_too_many_lines: "the breakdown carries {count} lines and the schema admits {max}",
        schema_breakdown_value_not_in_enum: "breakdown line {line}: {element} is \xAB{value}\xBB, which is not in the enumeration; it only takes {allowed}",
        schema_breakdown_regime_not_in_enum: "breakdown line {line}: ClaveRegimen \xAB{value}\xBB is not in the AEAT L8A/L8B lists",
        schema_breakdown_regime_not_allowed: "breakdown line {line}: ClaveRegimen is only admitted with tax {allowed}, and this line declares {tax}",
        schema_breakdown_regime_required: "breakdown line {line}: ClaveRegimen is required with tax {tax}; without it the AEAT answers error 1245",
        schema_breakdown_regime_requires_n2: "breakdown line {line}: ClaveRegimen {regime} requires CalificacionOperacion N2 and carries \xAB{qualification}\xBB",
        schema_breakdown_qualification_conflict: "breakdown line {line}: CalificacionOperacion and OperacionExenta are a schema choice \u2014 one or the other, never both",
        schema_breakdown_qualification_missing: "breakdown line {line}: CalificacionOperacion or OperacionExenta is missing; the schema requires one of the two",
        schema_breakdown_exemption_igic_only: "breakdown line {line}: OperacionExenta \xAB{value}\xBB only exists with tax 03 (IGIC); under VAT the list is E1\u2013E6",
        schema_breakdown_base_missing: "breakdown line {line}: {element} is required",
        schema_breakdown_exempt_amount_not_allowed: "breakdown line {line}: a line with OperacionExenta cannot carry {element}",
        schema_breakdown_untaxed_amount_not_allowed: "breakdown line {line}: with CalificacionOperacion \xAB{qualification}\xBB the line cannot carry {element}; it is the AEAT's error 1237",
        schema_breakdown_reverse_charge_not_zero: "breakdown line {line}: under reverse charge (S2) {element} has to be 0 and is {value}",
        schema_breakdown_reverse_charge_missing: "breakdown line {line}: under reverse charge (S2) {element} is required and goes to 0 \u2014 it is not left out",
        schema_breakdown_vat_rate_not_allowed: "breakdown line {line}: TipoImpositivo {value} is not a VAT rate; the AEAT only admits 0, 2, 4, 5, 7.5, 10 and 21",
        schema_breakdown_surcharge_rate_not_allowed: "breakdown line {line}: TipoRecargoEquivalencia {value} is not an equivalence surcharge rate; the AEAT admits 0, 0.26, 0.5, 0.62, 1, 1.4, 1.75 and 5.2",
        schema_simplified_over_ceiling: "a simplified F2 invoice cannot go over {ceiling} (plus {tolerance} of tolerance) adding base and tax of every line, and this one adds {total}; at this amount a full invoice identifying the customer is required",
        earlier_records_pending: "an earlier record of the same chain has to go first, because records reach the AEAT in order"
      },
      transmission_deferred: "Not sent to the AEAT yet: {why}"
    },
    colSeq: "Seq",
    colInvoice: "Invoice",
    colDate: "Date",
    colInvoiceType: "F.",
    colIssuer: "Issuer",
    colTotal: "Total",
    colStatus: "Status",
    recTypeAlta: "Registration",
    recTypeAnulacion: "Cancellation",
    statusPending: "Pending",
    statusTransmitted: "Transmitted",
    statusAccepted: "Accepted",
    statusRejected: "Rejected",
    statusError: "Error",
    statusRetry: "Retry",
    recordsTitle: "VeriFactu records",
    recordsSearchPlaceholder: "Search invoice, issuer or tax ID\u2026",
    recordsEmpty: "No VeriFactu records.",
    recordsEmptyNoInvoices: "No invoices issued yet. Every invoice you issue is sealed and listed here.",
    recordsNotSealingTitle: "The chain is not sealing",
    recordsNotSealing: "This hub has issued {count} invoice(s) and has 0 VeriFactu records. They are not reaching the AEAT, and by law they have to.",
    recordsNotSealingGrant: "Review permissions",
    recordsNotSealingEvents: "See dropped events",
    recordsSealingUnknown: "There are no records, and the number of issued invoices could not be read, so it is not possible to tell whether the chain is sealing. Ask an administrator to check it.",
    colRecord: "Record",
    colPriority: "Priority",
    colAttempts: "Attempts",
    colNextAttempt: "Next attempt",
    colLastError: "Last error",
    contingencyTitle: "Contingency queue",
    processQueue: "Process queue",
    processing: "Processing\u2026",
    contingencySearchPlaceholder: "Search record or status\u2026",
    contingencyEmpty: "Queue empty.",
    actionRetry: "Retry",
    actionCancel: "Cancel",
    errProcessQueue: "Could not process the queue",
    errRetry: "Could not requeue",
    errCancel: "Could not cancel",
    errCancelRequiredRecord: "Cannot discard: the record has not been registered with the AEAT yet. Retry the transmission instead.",
    errGoLiveIsOneWay: "Cannot switch back to test mode: this hub already sent an accepted record to the AEAT in production. To try things out, use another hub (a free one or the demo).",
    settingsTitle: "VeriFactu configuration",
    settingsSaved: "Configuration saved successfully.",
    errLoadConfig: "Error loading configuration",
    errSaveConfig: "Could not save configuration",
    enableVerifactu: "Enable VeriFactu",
    envAeat: "AEAT environment",
    envTesting: "Testing (AEAT Test)",
    envProduction: "Production",
    goLiveAction: "Go live",
    goLiveHint: "Your invoices are going to the AEAT's test environment. When everything is ready, go live: ERPlora checks that nothing is missing first.",
    goLiveConfirmTitle: "Send your invoices to the AEAT for real?",
    goLiveConfirmMessage: "From now on every invoice is filed with the real AEAT. You can go back to testing only until the first invoice is filed.",
    goLiveDone: "Your hub is live: invoices are now filed with the real AEAT.",
    goLiveDemoHint: "This is a demo hub: it always files with the AEAT's test environment. Create your own hub to go live.",
    goLiveOneWayHint: "Your hub has already filed invoices with the real AEAT, so it cannot go back to testing. To try things out, use another hub.",
    standDownAction: "Back to testing",
    standDownHint: "No invoice has been filed with the real AEAT yet, so you can still go back to testing.",
    standDownConfirmTitle: "Go back to the test environment?",
    standDownConfirmMessage: "Invoices will go to the AEAT's test environment again, and will not count before the tax authority.",
    standDownDone: "Your hub is back in the test environment.",
    errGoLive: "Could not go live. Try again in a moment.",
    errGoLiveStateUnavailable: "Could not read whether this hub files in testing or production. Check the connection and retry.",
    errGoLiveNeedsGrant: "To go live, ERPlora needs your signed authorisation to file on your behalf, approved by our team. Sign it in Configuration.",
    errGoLiveNotReady: "Your hub is not ready to go live yet: it needs your business tax details and a way to file (your own certificate or ERPlora's). Check Configuration.",
    errGoLiveDemo: "This is a demo hub and cannot go live. Create your own hub to file for real.",
    errGoLiveCertificateExpired: "Your own certificate has expired and the AEAT does not accept it. Upload a renewed one, or let ERPlora file for you, and try again.",
    errGoLiveClosed: "This hub ceased activity and does not issue invoices any more.",
    softwareNif: "Software / issuer tax ID",
    softwareName: "Software name",
    softwareId: "Software ID",
    softwareVersion: "Software version",
    certificatePath: "Certificate path (.p12)",
    certificatePathPlaceholder: "/path/to/certificate.p12",
    save: "Save configuration",
    saving: "Saving\u2026",
    certPkcs12: "PKCS#12 certificate (.p12 / .pfx)",
    certChoose: "Choose file\u2026",
    testTitle: "Live test",
    testHint: "Validates the certificate and sends a TEST record to the AEAT. Does not affect the real chain or your invoices.",
    testRun: "Send test",
    testRunning: "Sending\u2026",
    testCreateInvoice: "Create test invoice",
    testCreateInvoiceRunning: "Creating\u2026",
    testInvoiceCreated: "Test invoice created \u2014 view it in Invoicing.",
    testInvoiceTestingOnly: "Only available in the testing environment and with the issuer tax ID configured.",
    testType: "Test type",
    testTypeTicket: "Simplified ticket (F2)",
    testTypeInvoice: "Full invoice (F1, sample customer)",
    certExpiry: "Certificate expiry",
    certExpiryHint: "Extracted automatically from the certificate when you save it.",
    certDaysRemaining: "days remaining",
    certExpired: "The certificate has expired. Renew it to send to the AEAT.",
    testNoRun: "No test run yet. Save the certificate and press \u201CSend test\u201D.",
    testCert: "Certificate",
    testHuella: "Sample fingerprint (SHA-256)",
    testAeatLink: "AEAT verification link",
    testAeatLinkGo: "Verify at the tax agency \u2197",
    testQrNote: "Scan to validate the invoice at the AEAT",
    testAeatResp: "AEAT response",
    testAeatAccepted: "Accepted by the AEAT",
    testAeatNotSent: "Send not attempted (check the certificate).",
    testAeatNotSentDelegated: "Nothing was filed, and on this route that is correct: a filed record cannot be undone, so ERPlora checks the route instead of using it.",
    testAeatError: "AEAT send error",
    testEnv: "Environment",
    producerTitle: "Software identification",
    producerInfo: "Software manufacturer details, fixed and declared to the AEAT on every record.",
    producerNif: "Producer tax ID",
    producerName: "Producer name / company",
    obligadoNif: "Taxpayer (issuer) tax ID",
    obligadoName: "Issuer name / company",
    obligadoHint: "Business issuing the invoices. The AEAT validates it; it must match the certificate holder.",
    obligadoFromHub: "Taken from the business fiscal identity in Settings \u2192 Business. It is the hub's single source, so it is shown here and changed there.",
    obligadoMissing: "not configured",
    certLoaded: "loaded \u2713",
    certNotConfigured: "not configured",
    certHubHint: "The fiscal certificate is configured in Settings \u2192 Business (it's a hub resource, not this module's).",
    certGoSettings: "Go to Settings",
    routeTitle: "Filing with the tax authority",
    routeOwn: "with my own certificate",
    routeDelegated: "ERPlora does it for you",
    routeLoading: "checking\u2026",
    routeUnknown: "not available",
    routeUnknownHint: "This hub does not publish the filing route yet. Update the hub to see it here; meanwhile the screen only reports whether a certificate of your own is loaded.",
    routeOwnHint: "You sign and file with your own certificate; no authorisation to ERPlora is needed.",
    routeDelegatedHint: "ERPlora files your invoicing records with the tax authority on your behalf, with its own certificate. Your signed authorisation is what allows it.",
    grantTitle: "Representation authorisation",
    grantVigente: "approved",
    grantPendiente: "under review",
    grantRechazado: "returned",
    grantRevocado: "revoked",
    grantAbsent: "not signed",
    grantSince: "Last update",
    grantHint: "It is signed in Settings \u2192 Business, where ERPlora prepares the official form and a person reviews it. Only an approved authorisation lets your business go live.",
    certNotNeeded: "not needed on this route",
    certOptionalHint: "On this route you do not need a certificate of your own: ERPlora files with its own. Upload one only if you would rather file directly.",
    testNeedsGatewayIdentity: "Connect this hub with ERPlora above to run the live test.",
    testRoute: "Filed through",
    testGatewayReady: "ERPlora can file for you",
    testGatewayNotReady: "ERPlora cannot file for you right now",
    testNeedsOwnCertificate: "Upload the business certificate in Settings \u2192 Business to run the live test.",
    gatewayTitle: "Secure connection to ERPlora",
    gatewayHint: "So that ERPlora can file with the tax authority on your behalf, this hub and ERPlora identify each other with a certificate of this device. The private key is created here and never leaves it.",
    gatewayCommonName: "Identifier of this hub",
    gatewayValidUntil: "Valid until",
    gwLoading: "checking\u2026",
    gwUnknown: "not available",
    gwAbsent: "not requested",
    gwPending: "waiting for signature",
    gwActive: "active",
    gwExpiring: "expiring soon",
    gwExpired: "expired",
    gwUnknownHint: "We could not ask this hub about its connection. Reload the screen; if it keeps happening, the hub is not answering.",
    gwAbsentHint: "Request it and ERPlora prepares it. A person at ERPlora reviews and signs it, usually within 24-72 hours.",
    gwPendingHint: "Already requested. A person at ERPlora still has to sign it, usually within 24-72 hours; the hub collects it on its own as soon as they do.",
    gwExpiringHint: "Renew it before it expires: while it is expired, ERPlora cannot file on your behalf.",
    gwExpiredHint: "ERPlora cannot file on your behalf until you renew it. In the meantime your records wait in the contingency queue.",
    gwEnrol: "Request the connection",
    gwCheck: "Check the status",
    gwRenew: "Renew the connection",
    gwWorking: "Working\u2026",
    gwFiled: "Requested. A person at ERPlora reviews and signs it, usually within 24-72 hours.",
    gwAwaitingReview: "It was already requested and is still under review. Nothing else to do here.",
    gwInstalled: "Connection active. ERPlora can now file on your behalf.",
    gwRejected: "ERPlora returned the request.",
    gwOutOfBudget: "Too many checks in one hour. The hub keeps trying on its own; come back in a few minutes.",
    gwOutcomeUnknown: "ERPlora answered something this screen cannot read. Report it to support.",
    gwErrNoMachineCredential: "This hub has not finished connecting to ERPlora, so it cannot request anything yet. Try again in a few minutes.",
    gwErrCsrUnavailable: "This hub could not prepare the request. Report it to support.",
    gwErrCloudUnreachable: "We could not reach ERPlora. The hub keeps trying on its own; try again in a few minutes.",
    gwErrNotInstallable: "ERPlora signed the connection but this hub could not install it. Report it to support with the code below.",
    gwErrRefused: "ERPlora refused the request. The code below says why.",
    gwErrNotAdmin: "Only an administrator of the hub can request this connection.",
    gwErrHttp: "The hub did not answer the request. Try again in a moment.",
    capabilityTitle: "Permission: Business certificate (fiscal signing)",
    capabilityPending: "granted in Permissions",
    capabilityDenied: "not granted",
    capabilityHint: "VeriFactu signs and sends with the business certificate, and the hub only lends it to a module the owner has allowed. It is granted once in Settings \u2192 Permissions, and it starts OFF in any hub whose modules were not installed through the Apps consent dialog (a blueprint, the API or an import).",
    capabilityGoPermissions: "Go to Permissions",
    enabledNeedsPermission: "VeriFactu is on. For it to sign and send, the \xABBusiness certificate (fiscal signing)\xBB permission has to be granted in Settings \u2192 Permissions.",
    errCapabilityDenied: "VeriFactu is not allowed to sign: the \xABBusiness certificate (fiscal signing)\xBB permission is not granted. Grant it in Settings \u2192 Permissions and try again.",
    recoveryTitle: "Chain recovery",
    recChainStatus: "Chain integrity",
    recValidate: "Validate chain",
    recValidating: "Validating\u2026",
    recChainValid: "Fingerprint chain intact \u2713",
    recChainBroken: "Fingerprint chain BROKEN \u2717",
    recChainUnknown: "Not validated yet",
    recChainScope: "This recomputes the SHA-256 fingerprints and verifies the chaining. It does not re-audit the amounts: the base, quota and total are checked before a record is sealed, and once chained they are immutable.",
    recAeatTitle: "Latest records at the AEAT",
    recConsultAeat: "Query AEAT",
    recConsulting: "Querying\u2026",
    recAeatEmpty: "No AEAT data. Press \u201CQuery AEAT\u201D.",
    recColHuella: "Hash",
    recColCsv: "CSV",
    recColEstado: "Status",
    recRecoverFromAeat: "Recover chain from AEAT",
    recRecovering: "Recovering\u2026",
    recManualTitle: "Continue chain manually (migration)",
    recManualHint: "Paste the last hash (64 hex) from your previous application to continue the same chain.",
    recManualNif: "Issuer tax ID",
    recManualHash: "Last hash (64 hex)",
    recManualInvoice: "Invoice number (optional)",
    recManualDate: "Date (YYYY-MM-DD, optional)",
    recRecoverManual: "Continue from this hash",
    recCancel: "Cancel",
    recConfirmAeatTitle: "Recover the chain from AEAT",
    recConfirmAeatMessage: "Local continuity will be rebuilt from the latest record available at AEAT. Verify the issuer tax ID before continuing.",
    recConfirmManualTitle: "Continue the chain from an external hash",
    recConfirmManualMessage: "The supplied hash will become the predecessor of the next fiscal record. Use this only during a migration and after verifying the source data.",
    recConfirmAction: "Confirm recovery",
    recDone: "Operation completed.",
    recErrValidate: "Could not validate the chain",
    recErrConsult: "Could not query the AEAT",
    recErrRecover: "Could not recover the chain",
    recErrHash: "The hash must be 64 hexadecimal characters",
    errIssuerRequired: "VeriFactu cannot be enabled without a taxpayer: set the tax ID and company name in Settings \u2192 Business first.",
    errDemoEnvironmentLocked: "This is a demo hub: it always files to the AEAT test environment, so it cannot be switched to production. Everything else works \u2014 records are chained, and each one gets its ticket and its QR. To invoice for real, create your own hub.",
    errDemoCertificateLocked: "This is a demo hub: it cannot hold its own business certificate, because the AEAT issues no fictitious one. ERPlora files your records with the tax authority on your behalf, always against the test environment. To use your own, create your own hub.",
    errDemoIdentityLocked: "This is a demo hub: its tax ID and company name are fixed and cannot be edited, because the documents it issues are nobody's. To invoice under your own tax ID, create your own hub.",
    errTestRun: "Could not run the test",
    errTestInvoice: "Could not create the test invoice",
    back: "Back",
    errRecordNotFound: "Record not found",
    errLoadDetail: "Could not load the record",
    detailTitle: "Record {number}",
    fieldGeneratedAt: "Generated at",
    fieldTransmittedAt: "Transmitted at",
    chainSectionTitle: "Fingerprint chain",
    fieldPreviousHash: "Previous hash",
    deliveryFingerprintTitle: "Delivery fingerprint",
    fieldTransmissionId: "Transmission ID",
    fieldXmlSha256: "XML digest (SHA-256)",
    fieldXmlStoragePath: "XML file",
    fingerprintNotStamped: "Not stamped yet",
    aeatSectionTitle: "AEAT response",
    fieldAeatResponseCode: "Response code",
    fieldAeatResponseMessage: "Response message",
    fieldRetryCount: "Retries",
    fieldNextRetryAt: "Next retry at",
    pendingTitle: "Not at the AEAT yet",
    pendingWhenNextSend: "It goes out on its own at the next automatic send \u2014 every 5 minutes, as soon as this hub can file \u2014 in order and declared to the AEAT as a late submission. You don't need to do anything.",
    pendingWhenQueued: "It is in the contingency queue and goes out on its own at its next attempt, {at}, in order and declared to the AEAT as a late submission. You don't need to do anything.",
    pendingWhyUnknown: "It did not go out when it was created.",
    pendingWhyUnavailable: "The reason could not be loaded.",
    fieldQrUrl: "QR",
    fieldQrUrlLink: "Open QR",
    declTitle: "Responsible declaration",
    declDesc: "The declaration ERPlora signs for the version of the system you are running, and the identifying data every invoice sends to the tax authority. This is the screen you show if you are ever asked for them.",
    declRead: "Read the signed declaration",
    declTextVersion: "Declaration version",
    declDataTitle: "Identifying data of this system",
    declPending: "ERPlora's identifying data has not arrived yet. It arrives on its own within a minute of the system being up; until then no invoice can be sent to the tax authority.",
    declError: "Could not load the responsible declaration.",
    declNombreRazon: "Producer",
    declNIF: "Producer tax id",
    declNombreSistemaInformatico: "System name",
    declIdSistemaInformatico: "System code",
    declVersion: "Installed version",
    declNumeroInstalacion: "Installation number",
    declTipoUsoPosibleSoloVerifactu: "VERI*FACTU only",
    declTipoUsoPosibleMultiOT: "Can serve several taxpayers",
    declIndicadorMultiplesOT: "Serving several taxpayers",
    cfgTitle: "VeriFactu configuration",
    cfgOwnTitle: "Use my own certificate",
    cfgOwnOffHint: "ERPlora files your invoicing records with the tax authority on your behalf, with its own certificate. You do not need one.",
    cfgOwnOnHint: "You file directly with the tax authority using your business certificate. It never leaves this hub.",
    cfgOwnOffKeptHint: "Your certificate is still stored on this hub, but ERPlora now files on your behalf with its own certificate. Switch it on to use yours again.",
    routeSwitchedOwn: "Done: from now on you file with your own certificate.",
    routeSwitchedDelegated: "Done: from now on ERPlora files on your behalf. Your certificate is still stored.",
    errRouteNeedsGrant: "For ERPlora to file in production, your representation grant still has to be approved. Until then you keep filing with your certificate.",
    errRouteNeedsConnection: "For ERPlora to file, this hub\u2019s secure connection still has to be signed. Until then you keep filing with your certificate.",
    errRouteNeedsCertificate: "There is no certificate uploaded: upload it in Configuration to use it.",
    errRouteSwitch: "The filing route could not be changed. Nothing changed; please try again.",
    cfgP12Title: "Business certificate (.p12 / .pfx)",
    cfgP12Present: "Loaded",
    cfgP12Absent: "Not loaded",
    cfgP12Holder: "Holder",
    cfgP12Uploaded: "Uploaded on",
    cfgP12Hint: "The file and its password are kept by the hub and never travel to this screen again.",
    cfgP12Password: "Certificate password",
    cfgP12Upload: "Upload certificate",
    cfgP12Uploading: "Uploading\u2026",
    cfgP12Uploaded2: "Certificate uploaded",
    cfgP12NoFile: "Choose a .p12 or .pfx file first.",
    cfgP12Error: "The certificate could not be saved. Check the file and the password.",
    cfgP12Denied: "This app is not authorised to use the business certificate. Grant it in Settings \u2192 Permissions.",
    cfgP12Removed: "Certificate removed. ERPlora files on your behalf again.",
    cfgRemoveTitle: "This removes your certificate",
    cfgRemoveHint: "Turning this off deletes the certificate from this hub and goes back to ERPlora filing on your behalf. You can upload it again later.",
    cfgRemoveConfirm: "Remove it",
    cfgRemoveCancel: "Keep it",
    cfgDelegatedTitle: "ERPlora files for you",
    cfgDelegatedHint: "Your signed authorisation is what allows it. Without it, the business cannot go to production.",
    cfgDelegatedGrant: "Authorisation",
    cfgDelegatedGoDocuments: "Go to Documents",
    cfgGrantTitle: "Representation agreement",
    cfgGrantHint: "You download the official model already filled in with your details, sign it outside this screen and upload it back. A person at ERPlora reviews it.",
    cfgGrantAt: "Signed on",
    grantDownloaded: "Model downloaded. Sign it and upload it below.",
    cfgGoConfig: "Open configuration",
    cfgTabDelegated: "ERPlora files for me",
    cfgTabOwn: "My certificate",
    grantBusinessMissingTitle: "Your business details are incomplete",
    grantBusinessMissingHint: "The official model is filled in with the tax ID, legal name and fiscal address from Settings \u2192 Business. Complete them there so the signed model matches your invoices.",
    grantBusinessFix: "Complete business details",
    dropTitle: "Drag the file here or {browse}",
    dropBrowse: "choose it",
    dropErrorType: "\u201C{name}\u201D is not an accepted file type.",
    dropErrorSize: "\u201C{name}\u201D is larger than {size}.",
    dropRemove: "Remove {name}",
    cfgP12Choose: "Business certificate (.p12 or .pfx)"
  },
  setup: {
    title: "Set up VeriFactu",
    description: "Turn on VeriFactu and upload your business certificate to send your invoices to the AEAT."
  },
  grant: {
    intro: "ERPlora files your invoicing records with the tax authority ON YOUR BEHALF. Spanish law needs your signed consent for that: the official form of the colaboraci\xF3n social agreement. You download it, sign it away from this screen, and upload it back.",
    stateVigente: "Approved on {date}. ERPlora may file on your behalf.",
    statePendiente: "Uploaded on {date}. We are checking it and will email you within 24-72 hours.",
    stateRejected: "Sent back on {date}. Fix what is noted below and upload it again.",
    stateRevoked: "Revoked on {date}. ERPlora cannot file on your behalf.",
    stateAbsent: "Not signed yet. Your business cannot go live until it is.",
    stateUnknown: "Checking with ERPlora\u2026",
    stateUnreachable: "We could not reach ERPlora, so we cannot tell you where this stands.",
    step1Title: "1 \xB7 Get the official form",
    step1Hint: "We fill it in with your details. Its wording is set by the tax authority and cannot be changed.",
    step2Title: "2 \xB7 Upload the signed form",
    step2Hint: "A person at ERPlora checks it and emails you within 24-72 hours.",
    municipio: "Town or city",
    via: "Street",
    numero: "Number",
    signerNif: "ID number of the person signing",
    signerName: "Full name of the person signing",
    downloadModel: "Download the form",
    howToByHand: "By hand: print it, sign it, stamp it with the company seal if your business is a company, and scan it back to PDF.",
    howToElectronic: "Electronically: sign the PDF with AutoFirma using your own qualified certificate. A drawn signature is not accepted.",
    privacyTitle: "Data protection \u2014 the essentials (art. 13 GDPR)",
    privacyController: "Controller: ERPLORA CLOUD SL (B27593136). We hold these documents as your representative.",
    privacyPurpose: "Purpose and basis: to file your invoicing records with the Spanish tax authority on your behalf, under the grant you sign and our legal duties. We keep them while the grant lasts and for the tax retention periods.",
    documentType: "Identity document",
    documentTypeDni: "DNI (Spanish national ID)",
    documentTypeNie: "NIE (foreign resident ID)",
    signedDocumentChoose: "Attach the signed form (PDF)",
    dniChoose: "Attach a copy of the ID",
    signatureSampleWhy: "A NIE often carries no printed signature, so we need a sheet with your handwritten signature to compare it against.",
    signatureSampleChoose: "Attach a signature sample",
    representationProofWhy: "Your business is a company, so we need the document that names the person allowed to sign for it.",
    representationProofChoose: "Attach the proof of representation",
    submit: "Send for review",
    preferComputer: "I would rather do this from my computer",
    partyLegalRepresentative: "Legal representative",
    partyLegalRepresentativeHint: "The person who signs on behalf of the company, as named in its deeds. Their ID copy is the one uploaded below.",
    privacyRights: "Your rights: access, rectification, erasure, objection and portability at privacy@erplora.com.",
    errors: {
      obligado_nif_required: "Your business needs a taxpayer ID before you can do this.",
      signer_required: "Fill in the name and ID number of the person signing.",
      document_type_invalid: "Pick the kind of identity document.",
      signed_document_required: "Attach the signed form.",
      signed_document_not_pdf: "The signed form has to be a PDF \u2014 scan it or sign it with AutoFirma.",
      dni_copy_required: "Attach a copy of the identity document.",
      signature_sample_required: "With a NIE we also need a sample of your handwritten signature.",
      representation_proof_required: "Attach the document that proves you may sign for the company.",
      document_too_large: "Each file has to be under 10 MB.",
      invalid_via: "That route is not one we can file through.",
      cloud_rejected: "ERPlora could not handle this right now. Try again in a few minutes.",
      hub_not_enrolled: "This hub is not connected to ERPlora yet.",
      identity_not_shared: "We could not tell ERPlora who the taxpayer is. If the page asks for your tax details, save them again in Settings \u2192 Business.",
      open_external_failed: "We could not open your browser.",
      unknown: "It did not work. Try again."
    },
    submittedTitle: "What you sent",
    submittedOn: "Submission #{n}, sent on {date}",
    reviewedOn: "Reviewed on {date}",
    docSignedDocument: "Signed model",
    docDniCopy: "Copy of the identity document",
    docSignatureSample: "Signature sample",
    docRepresentationProof: "Proof of representation",
    historyTitle: "Submission history",
    historyRow: "#{n} \xB7 {date}",
    historyPending: "Under review",
    historyInForce: "Accepted: in force",
    historyRejected: "Rejected",
    historyRevoked: "Revoked",
    historyReplaced: "Replaced by a newer submission",
    resend: "Send again",
    resendCancel: "Cancel",
    resendHintPending: "If something came out wrong, send it again: the new submission replaces the one under review.",
    resendHintInForce: "While we review the new submission, you keep filing with the current one."
  }
};

// ui/components/erp-verifactu-grant/erp-verifactu-grant.ts
var CATALOG = { es: es_default, en: en_default };
function erplora() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var ENTITY_LETTERS = "ABCDEFGHJNPQRSUVW";
var MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
function isLegalPersonNif(nif) {
  const normalised = nif.replace(/[\s.-]/g, "").toUpperCase();
  return normalised.length > 0 && ENTITY_LETTERS.includes(normalised[0]);
}
var KNOWN_REFUSALS = /* @__PURE__ */ new Set([
  "obligado_nif_required",
  "signer_required",
  "document_type_invalid",
  "signed_document_required",
  "signed_document_not_pdf",
  "dni_copy_required",
  "signature_sample_required",
  "representation_proof_required",
  "document_too_large",
  "invalid_via",
  "cloud_rejected",
  "hub_not_enrolled",
  "identity_not_shared",
  "open_external_failed"
]);
var _ErpVerifactuGrant = class _ErpVerifactuGrant extends i3 {
  constructor() {
    super(...arguments);
    this.obligadoNif = "";
    this.obligadoName = "";
    this.businessCity = "";
    this.businessStreet = "";
    this.businessNumber = "";
    this.status = "";
    this.at = "";
    this.rejectedReason = "";
    this.version = 0;
    this.submittedAt = "";
    this.reviewedAt = "";
    this.documents = {
      signed_document: false,
      dni_copy: false,
      signature_sample: false,
      representation_proof: false
    };
    this.history = [];
    this.resendOpen = false;
    this.loading = true;
    this.signerNif = "";
    this.signerName = "";
    this.signerMunicipio = "";
    this.signerVia = "";
    this.signerNumero = "";
    this.documentType = "dni";
    this.signedDocument = null;
    this.dniFile = null;
    this.signatureSample = null;
    this.representationProof = null;
    this.busy = false;
    this.downloading = false;
    this.downloaded = false;
    this.errorKey = "";
    this.errorStatusCode = null;
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:block; }
    .panel { display:flex; flex-direction:column; gap:.6rem; }
    .state { display:flex; align-items:center; gap:.5rem; }
    .hint { font-size:.82rem; color: var(--ion-color-medium, #6b7280); margin:0; }
    h3 { margin:.6rem 0 0; font-size:.95rem; }
    h4 { margin:.5rem 0 0; font-size:.85rem; color: var(--ion-color-medium, #6b7280); }
    .row { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:.5rem; }
    @media (max-width: 560px) { .row { grid-template-columns: 1fr; } }
    .privacy { background: var(--ion-color-light, #f4f5f8); border-radius: var(--ok-radius-sm, 8px); padding:.6rem .75rem; display:flex; flex-direction:column; gap:.35rem; }
    .privacy p { margin:0; font-size:.78rem; }
    .privacy .title { font-weight:600; }
    .file { display:flex; flex-direction:column; gap:.25rem; }
    ion-button { min-height:44px; }
    ion-input, ion-select { min-height:44px; }
    ok-inline-feedback { display:block; }
    /* La zona de subida va al ancho del formulario, como el resto de campos: en el hub nada
       lleva tope de ancho (hub#1605), y ok-dropzone trae 480 px por defecto. */
    ok-dropzone { --ok-dropzone-max-width: 100%; }
    .submitted, .history { display:flex; flex-direction:column; gap:.25rem; }
    .docs, .rows { list-style:none; margin:.25rem 0 0; padding:0; display:flex; flex-direction:column; gap:.25rem; }
    .docs li { display:flex; align-items:center; gap:.4rem; font-size:.85rem; }
    .docs ion-icon { color: var(--ion-color-success, #2dd36f); font-size:1.1rem; }
    .rows li { display:flex; flex-wrap:wrap; justify-content:space-between; gap:.25rem .75rem; font-size:.8rem; padding:.3rem 0; border-bottom:1px solid var(--ion-color-light, #eceef1); }
    .rows .k { color: var(--ion-color-medium, #6b7280); }
    .resend { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem; }
  `;
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    await this.load();
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
  }
  async load() {
    this.loading = true;
    try {
      this.applyState(await getGrant());
    } catch {
      this.status = "";
    } finally {
      this.loading = false;
    }
  }
  /**
   * Cuándo hay algo que hacer. Con el otorgamiento vigente no se pide nada; mientras se revisa
   * tampoco — ofrecer «vuelve a subirlo» a quien acaba de subirlo es lo que genera los duplicados
   * que otra persona tiene que desempatar a mano.
   */
  get showForm() {
    if (this.status === "vigente" || this.status === "pendiente") return this.resendOpen;
    return true;
  }
  /** What the core said, painted as it came. Shared by the first read and the read-back after a submit. */
  applyState(state) {
    this.status = state.status;
    this.at = state.at;
    this.rejectedReason = state.rejected_reason;
    this.version = state.version;
    this.submittedAt = state.submitted_at;
    this.reviewedAt = state.reviewed_at;
    this.documents = state.documents;
    this.history = state.history;
    if (state.document_type === "dni" || state.document_type === "nie") {
      this.documentType = state.document_type;
    }
  }
  /** The states where a new submission is an option rather than the obvious next step. */
  get canResend() {
    return this.status === "vigente" || this.status === "pendiente";
  }
  /** Something was sent and the core knows about it: the «what you sent» block has a subject. */
  get hasSubmission() {
    return this.version > 0 && this.status !== "" && this.status !== "absent";
  }
  /** A calendar date in the owner's locale, or the raw value when it is not a date. */
  dateLabel(iso) {
    if (!iso) return "";
    const d3 = new Date(iso);
    return Number.isNaN(d3.getTime()) ? iso : d3.toLocaleDateString(erplora().locale || void 0);
  }
  /** The outcome of one submission, as a catalogue key. Superseded wins: it was never judged. */
  historyKey(row) {
    if (row.superseded) return "grant.historyReplaced";
    if (row.status === "pendiente") return "grant.historyPending";
    if (row.status === "vigente") return "grant.historyInForce";
    if (row.status === "rechazado") return "grant.historyRejected";
    if (row.status === "revocado") return "grant.historyRevoked";
    return "grant.stateUnknown";
  }
  /** Muchos NIE no llevan firma impresa: sin una muestra no hay con qué comparar la del modelo. */
  get needsSignatureSample() {
    return this.documentType === "nie";
  }
  /**
   * ¿El obligado es una SOCIEDAD? Decide qué redacción del modelo oficial se usa: una persona física
   * firma ella misma; una entidad firma «en su nombre D/Dña … como representante legal según
   * documento justificativo que se adjunta» (Anexo I del acuerdo 017).
   */
  get isCompany() {
    return isLegalPersonNif(this.obligadoNif);
  }
  get needsRepresentationProof() {
    return this.isCompany;
  }
  /**
   * Quién firma, de verdad. Un autónomo firma él mismo, así que su firmante ES el negocio; la API
   * del plano de control exige `signer_*` en los dos casos, y mandar el del negocio es decir lo
   * mismo que el modelo, no inventar un segundo firmante.
   */
  get effectiveSigner() {
    return this.isCompany ? {
      nif: this.signerNif,
      name: this.signerName,
      city: this.signerMunicipio,
      street: this.signerVia,
      number: this.signerNumero
    } : {
      nif: this.obligadoNif,
      name: this.obligadoName,
      city: this.businessCity,
      street: this.businessStreet,
      number: this.businessNumber
    };
  }
  /**
   * Lo que le falta a Ajustes → Negocio para que el modelo salga completo. El número puede faltar
   * de verdad (un «s/n»), pero sin municipio ni vía el domicilio fiscal no existe.
   */
  get businessMissing() {
    return !this.obligadoNif.trim() || !this.obligadoName.trim() || !this.businessCity.trim() || !this.businessStreet.trim();
  }
  get canDownloadModel() {
    const signer = this.effectiveSigner;
    return !!this.obligadoNif.trim() && !!signer.nif.trim() && !!signer.name.trim();
  }
  get canSubmit() {
    return !!this.obligadoNif.trim() && !!this.obligadoName.trim() && !!this.signedDocument && !!this.dniFile && (!this.needsSignatureSample || !!this.signatureSample) && (!this.needsRepresentationProof || !!this.representationProof);
  }
  /** La fecha del estado en el idioma de quien mira, o la cruda si no se puede leer. */
  get atLabel() {
    if (!this.at) return "";
    const d3 = new Date(this.at);
    return Number.isNaN(d3.getTime()) ? this.at : d3.toLocaleDateString(erplora().locale || void 0);
  }
  stateKey() {
    if (this.status === "vigente") return "grant.stateVigente";
    if (this.status === "pendiente") return "grant.statePendiente";
    if (this.status === "rechazado") return "grant.stateRejected";
    if (this.status === "revocado") return "grant.stateRevoked";
    if (this.status === "absent") return "grant.stateAbsent";
    return this.loading ? "grant.stateUnknown" : "grant.stateUnreachable";
  }
  stateTone() {
    if (this.status === "vigente") return "success";
    if (this.status === "pendiente") return "info";
    if (this.status === "rechazado" || this.status === "revocado") return "danger";
    return "warning";
  }
  modelFields() {
    const signer = this.effectiveSigner;
    return {
      obligado_nif: this.obligadoNif,
      obligado_name: this.obligadoName,
      obligado_municipio: this.businessCity,
      obligado_via: this.businessStreet,
      obligado_numero: this.businessNumber,
      signer_nif: signer.nif,
      signer_name: signer.name,
      signer_municipio: signer.city,
      signer_via: signer.street,
      signer_numero: signer.number
    };
  }
  /** Lleva a Ajustes → Negocio, que es donde se arregla. Mismo patrón módulo→shell que el resto. */
  goToBusiness() {
    window.history.pushState({}, "", "/settings#business");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  /** Traduce el rechazo por su CÓDIGO. Uno que no conocemos conserva su status, que sí se entiende. */
  noteFailure(e6) {
    const error = e6 instanceof RepresentationGrantError ? e6 : null;
    this.errorKey = error?.code && KNOWN_REFUSALS.has(error.code) ? `grant.errors.${error.code}` : "grant.errors.unknown";
    this.errorStatusCode = error?.statusCode ?? null;
  }
  /**
   * Descarga el modelo oficial ya relleno. El navegador lo guarda donde el usuario tenga puesto;
   * dentro de la app instalada un `<a download>` no hace nada en Android, así que el hueco de
   * «guardado en …» se rellena cuando el host lo diga, no se inventa aquí.
   */
  async downloadModel() {
    this.downloading = true;
    this.errorKey = "";
    try {
      const blob = await downloadGrantModel(this.modelFields());
      const url = URL.createObjectURL(blob);
      const a3 = document.createElement("a");
      a3.href = url;
      a3.download = "otorgamiento-verifactu.pdf";
      a3.click();
      URL.revokeObjectURL(url);
      this.downloaded = true;
    } catch (e6) {
      this.noteFailure(e6);
    } finally {
      this.downloading = false;
    }
  }
  async submit() {
    if (!this.signedDocument || !this.dniFile) return;
    this.busy = true;
    this.errorKey = "";
    try {
      const result = await postGrant({
        obligado_nif: this.obligadoNif,
        obligado_name: this.obligadoName,
        signer_nif: this.effectiveSigner.nif,
        signer_name: this.effectiveSigner.name,
        document_type: this.documentType,
        signed_document: this.signedDocument,
        dni_copy: this.dniFile,
        ...this.signatureSample ? { signature_sample: this.signatureSample } : {},
        ...this.representationProof ? { representation_proof: this.representationProof } : {}
      });
      this.status = result.status;
      this.at = result.at;
      this.rejectedReason = "";
      this.signedDocument = null;
      this.dniFile = null;
      this.signatureSample = null;
      this.representationProof = null;
      this.resendOpen = false;
      await this.readBack();
    } catch (e6) {
      this.noteFailure(e6);
    } finally {
      this.busy = false;
    }
  }
  /**
   * After a submit, what is on screen (number, documents, history) is READ from the core, never
   * assumed from the POST. A read that fails keeps the answer the POST gave: the upload happened.
   */
  async readBack() {
    try {
      this.applyState(await getGrant());
    } catch {
    }
  }
  static {
    this.DOCUMENT_PARTS = [
      ["signed_document", "grant.docSignedDocument"],
      ["dni_copy", "grant.docDniCopy"],
      ["signature_sample", "grant.docSignatureSample"],
      ["representation_proof", "grant.docRepresentationProof"]
    ];
  }
  /** «What you sent»: the submission number, its date and the parts ERPlora received. */
  renderSubmitted(t5) {
    if (!this.hasSubmission) return A;
    const received = _ErpVerifactuGrant.DOCUMENT_PARTS.filter(([part]) => this.documents[part]);
    return b2`<div class="submitted" data-testid="grant-submitted">
      <h4>${t5("grant.submittedTitle")}</h4>
      <p class="hint">
        ${t5("grant.submittedOn", { n: this.version, date: this.dateLabel(this.submittedAt) })}
        ${this.reviewedAt ? b2` · ${t5("grant.reviewedOn", { date: this.dateLabel(this.reviewedAt) })}` : A}
      </p>
      <ul class="docs">
        ${received.map(
      ([part, key]) => b2`<li data-testid=${`grant-doc-${part}`}><ion-icon name="checkmark-circle-outline"></ion-icon>${t5(key)}</li>`
    )}
      </ul>
    </div>`;
  }
  /** Every submission with its outcome. One row would only repeat the block above, so it needs two. */
  renderHistory(t5) {
    if (this.history.length < 2) return A;
    return b2`<div class="history" data-testid="grant-history">
      <h4>${t5("grant.historyTitle")}</h4>
      <ul class="rows">
        ${this.history.map(
      (row) => b2`<li data-testid="grant-history-row">
            <span class="k">${t5("grant.historyRow", { n: row.version, date: this.dateLabel(row.submitted_at) })}</span>
            <span>${t5(this.historyKey(row))}${row.rejected_reason && !row.superseded ? `: ${row.rejected_reason}` : ""}</span>
          </li>`
    )}
      </ul>
    </div>`;
  }
  /** «Send again», and once asked for, what happens to the submission that is already there. */
  renderResend(t5) {
    if (!this.canResend) return A;
    if (!this.resendOpen) {
      return b2`<div class="resend">
        <ion-button fill="outline" size="small" data-testid="grant-resend" @click=${() => {
        this.resendOpen = true;
      }}>
          <ion-icon slot="start" name="refresh-outline"></ion-icon>${t5("grant.resend")}
        </ion-button>
      </div>`;
    }
    return b2`<ok-inline-feedback tone="info" icon="information-circle-outline" data-testid="grant-resend-hint"
        >${t5(this.status === "vigente" ? "grant.resendHintInForce" : "grant.resendHintPending")}</ok-inline-feedback
      >
      <div class="resend">
        <ion-button fill="clear" size="small" data-testid="grant-resend-cancel" @click=${() => {
      this.resendOpen = false;
    }}>
          ${t5("grant.resendCancel")}
        </ion-button>
      </div>`;
  }
  /**
   * Un adjunto, con `ok-dropzone`: arrastrar y soltar o pulsar, y el tipo se filtra en el propio
   * control. Un solo fichero por zona (sin `multiple`), así que soltar otro lo sustituye y quitarlo
   * vacía la zona — `ok-change` trae siempre la lista entera, también cuando queda vacía.
   */
  dropzone(testid, accept, hint, onPick) {
    return b2`<ok-dropzone
      data-testid=${testid}
      accept=${accept}
      max-size=${MAX_ATTACHMENT_BYTES}
      hint=${hint}
      .labels=${this.dropzoneLabels()}
      @ok-change=${(e6) => onPick(e6.detail?.files?.[0] ?? null)}
    ></ok-dropzone>`;
  }
  /** Los textos de la zona en el idioma de quien mira (el componente trae inglés por defecto). */
  dropzoneLabels() {
    const t5 = (k2) => erplora().t(CATALOG, k2);
    return {
      title: t5("ui.dropTitle"),
      browse: t5("ui.dropBrowse"),
      errorType: t5("ui.dropErrorType"),
      errorSize: t5("ui.dropErrorSize"),
      removeLabel: t5("ui.dropRemove")
    };
  }
  renderForm(t5) {
    return b2`
      <p class="hint">${t5("grant.intro")}</p>

      ${this.businessMissing ? b2`<ok-inline-feedback
            data-testid="grant-business-missing"
            tone="warning"
            icon="business-outline"
            heading=${t5("ui.grantBusinessMissingTitle")}
          >
            ${t5("ui.grantBusinessMissingHint")}
            <ion-button
              size="small"
              fill="outline"
              data-testid="grant-business-fix"
              @click=${() => this.goToBusiness()}
            >${t5("ui.grantBusinessFix")}</ion-button>
          </ok-inline-feedback>` : A}

      <h3>${t5("grant.step1Title")}</h3>
      <p class="hint">${t5("grant.step1Hint")}</p>

      ${this.isCompany ? b2`
            <h4 data-testid="grant-party-signer">${t5("grant.partyLegalRepresentative")}</h4>
            <p class="hint">${t5("grant.partyLegalRepresentativeHint")}</p>
            ${this.textField("grant-signer-name", t5("grant.signerName"), this.signerName, (v3) => {
      this.signerName = v3;
    })}
            ${this.textField("grant-signer-nif", t5("grant.signerNif"), this.signerNif, (v3) => {
      this.signerNif = v3;
    })}
            <div class="row">
              ${this.textField("grant-signer-municipio", t5("grant.municipio"), this.signerMunicipio, (v3) => {
      this.signerMunicipio = v3;
    })}
              ${this.textField("grant-signer-via", t5("grant.via"), this.signerVia, (v3) => {
      this.signerVia = v3;
    })}
              ${this.textField("grant-signer-numero", t5("grant.numero"), this.signerNumero, (v3) => {
      this.signerNumero = v3;
    })}
            </div>
          ` : A}

      <ion-button
        expand="block"
        data-testid="grant-download-model"
        ?disabled=${!this.canDownloadModel || this.downloading}
        @click=${() => void this.downloadModel()}
      >
        ${t5("grant.downloadModel")}
      </ion-button>
      ${this.downloaded ? b2`<ok-inline-feedback tone="success" icon="checkmark-circle-outline" data-testid="grant-downloaded"
            >${t5("ui.grantDownloaded")}</ok-inline-feedback
          >` : A}

      <p class="hint">${t5("grant.howToByHand")}</p>
      <p class="hint">${t5("grant.howToElectronic")}</p>

      <!-- La informacion basica del art. 13 RGPD va AQUI, antes de que nadie suba un documento de
           identidad, no en un enlace al final. -->
      <div class="privacy" data-testid="grant-privacy">
        <p class="title">${t5("grant.privacyTitle")}</p>
        <p>${t5("grant.privacyController")}</p>
        <p>${t5("grant.privacyPurpose")}</p>
        <p>${t5("grant.privacyRights")}</p>
      </div>

      <h3>${t5("grant.step2Title")}</h3>
      <p class="hint">${t5("grant.step2Hint")}</p>

      ${this.dropzone("grant-signed-document", ".pdf,application/pdf", t5("grant.signedDocumentChoose"), (f3) => {
      this.signedDocument = f3;
    })}

      <!-- Dentro de un ion-item y con la interfaz por defecto, como en la documentacion de Ionic: un
           popover no se posiciona desde el shadow root y el selector no llegaba a abrirse. -->
      <ion-item>
        <ion-select
          label-placement="floating"
          data-testid="grant-document-type"
          label=${t5("grant.documentType")}
          .value=${this.documentType}
          @ionChange=${(e6) => {
      this.documentType = String(e6.target.value);
    }}
        >
          <ion-select-option value="dni">${t5("grant.documentTypeDni")}</ion-select-option>
          <ion-select-option value="nie">${t5("grant.documentTypeNie")}</ion-select-option>
        </ion-select>
      </ion-item>

      ${this.dropzone("grant-dni-copy", "image/*,.pdf", t5("grant.dniChoose"), (f3) => {
      this.dniFile = f3;
    })}

      ${this.needsSignatureSample ? b2`<p class="hint">${t5("grant.signatureSampleWhy")}</p>
            ${this.dropzone("grant-signature-sample", "image/*,.pdf", t5("grant.signatureSampleChoose"), (f3) => {
      this.signatureSample = f3;
    })}` : A}

      ${this.needsRepresentationProof ? b2`<p class="hint">${t5("grant.representationProofWhy")}</p>
            ${this.dropzone("grant-representation-proof", "image/*,.pdf", t5("grant.representationProofChoose"), (f3) => {
      this.representationProof = f3;
    })}` : A}

      <ion-button
        expand="block"
        data-testid="grant-submit"
        ?disabled=${!this.canSubmit || this.busy}
        @click=${() => void this.submit()}
      >
        ${t5("grant.submit")}
      </ion-button>

      ${this.errorKey ? b2`<ok-inline-feedback tone="danger" icon="alert-circle-outline" data-testid="grant-error"
            >${t5(this.errorKey)}${this.errorStatusCode ? ` (${this.errorStatusCode})` : ""}</ok-inline-feedback
          >` : A}
    `;
  }
  textField(testid, label, value, onInput) {
    return b2`<ion-input
      mode="md"
      fill="outline"
      label-placement="floating"
      data-testid=${testid}
      label=${label}
      .value=${value}
      @ionInput=${(e6) => onInput(String(e6.target.value ?? ""))}
    ></ion-input>`;
  }
  render() {
    const t5 = (k2, p4) => erplora().t(CATALOG, k2, p4);
    return b2`
      <div class="panel">
        <ok-inline-feedback
          data-testid=${`grant-state-${this.status || "unknown"}`}
          tone=${this.stateTone()}
          icon="shield-outline"
        >${t5(this.stateKey(), { date: this.atLabel })}</ok-inline-feedback>

        ${this.status === "rechazado" && this.rejectedReason ? b2`<ok-inline-feedback tone="danger" icon="alert-circle-outline" data-testid="grant-rejected-reason"
              >${this.rejectedReason}</ok-inline-feedback
            >` : A}

        ${this.renderSubmitted(t5)}
        ${this.renderHistory(t5)}
        ${this.renderResend(t5)}
        ${this.showForm ? this.renderForm(t5) : A}
      </div>
    `;
  }
};
__decorateClass([
  n4({ type: String })
], _ErpVerifactuGrant.prototype, "obligadoNif", 2);
__decorateClass([
  n4({ type: String })
], _ErpVerifactuGrant.prototype, "obligadoName", 2);
__decorateClass([
  n4({ type: String })
], _ErpVerifactuGrant.prototype, "businessCity", 2);
__decorateClass([
  n4({ type: String })
], _ErpVerifactuGrant.prototype, "businessStreet", 2);
__decorateClass([
  n4({ type: String })
], _ErpVerifactuGrant.prototype, "businessNumber", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "status", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "at", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "rejectedReason", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "version", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "submittedAt", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "reviewedAt", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "documents", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "history", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "resendOpen", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "loading", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "signerNif", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "signerName", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "signerMunicipio", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "signerVia", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "signerNumero", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "documentType", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "signedDocument", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "dniFile", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "signatureSample", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "representationProof", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "busy", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "downloading", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "downloaded", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "errorKey", 2);
__decorateClass([
  r5()
], _ErpVerifactuGrant.prototype, "errorStatusCode", 2);
var ErpVerifactuGrant = _ErpVerifactuGrant;
define("erp-verifactu-grant", ErpVerifactuGrant);

// ui/lib/gateway-identity.ts
var GATEWAY_IDENTITY_PATH = "/api/business/gateway-identity";
var GATEWAY_ENROL_PATH = "/api/business/gateway-identity/enrol";
var HUB_SESSION_KEY2 = "erplora.hub_session";
var EXPIRY_WARNING_DAYS = 30;
function gatewayState(wire, nowMs) {
  if (!wire) return "unknown";
  if (!wire.has_certificate) return wire.has_key ? "pending" : "absent";
  const iso = (wire.not_after ?? "").trim();
  if (!iso) return "active";
  const endOfDay = Date.parse(`${iso}T23:59:59Z`);
  if (Number.isNaN(endOfDay)) return "active";
  if (endOfDay < nowMs) return "expired";
  return endOfDay - nowMs <= EXPIRY_WARNING_DAYS * 864e5 ? "expiring" : "active";
}
var OUTCOMES = {
  filed: { key: "ui.gwFiled", tone: "success" },
  awaiting_review: { key: "ui.gwAwaitingReview", tone: "info" },
  installed: { key: "ui.gwInstalled", tone: "success" },
  rejected: { key: "ui.gwRejected", tone: "danger" },
  out_of_budget: { key: "ui.gwOutOfBudget", tone: "warning" }
};
function enrolOutcome(state) {
  return OUTCOMES[state] ?? { key: "ui.gwOutcomeUnknown", tone: "warning" };
}
var REFUSAL_KEYS = {
  "enrolment.no_machine_credential": "ui.gwErrNoMachineCredential",
  "enrolment.csr_unavailable": "ui.gwErrCsrUnavailable",
  "enrolment.cloud_unreachable": "ui.gwErrCloudUnreachable",
  "enrolment.cloud_refused": "ui.gwErrCloudUnreachable",
  "enrolment.no_issued_document": "ui.gwErrNotInstallable",
  "enrolment.issued_not_base64": "ui.gwErrNotInstallable",
  "enrolment.issued_without_ca": "ui.gwErrNotInstallable",
  "enrolment.install_refused": "ui.gwErrNotInstallable"
};
function refusalKey(code) {
  return REFUSAL_KEYS[code] ?? "ui.gwErrRefused";
}
function hubSession2() {
  try {
    return globalThis.localStorage?.getItem(HUB_SESSION_KEY2) ?? null;
  } catch {
    return null;
  }
}
async function gatewayFetch(path, method) {
  const headers = {};
  const session = hubSession2();
  if (session) headers["X-Hub-Session"] = session;
  let res;
  try {
    res = await fetch(path, { method, headers, credentials: "same-origin" });
  } catch {
    return { ok: false, status: 0, body: {} };
  }
  let body = {};
  try {
    const parsed = await res.json();
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    body = {};
  }
  return { ok: res.ok, status: res.status, body };
}

// ui/components/erp-verifactu-config/erp-verifactu-config.ts
var CATALOG2 = { es: es_default, en: en_default };
function erplora2() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var MAX_CERTIFICATE_BYTES = 1024 * 1024;
var CERTIFICATE_PATH = "/api/business/certificate";
var SETTINGS_PATH = "/api/settings";
var ROUTE_OWN = "own";
var GATEWAY_STATES = {
  unknown: { tone: "neutral", label: "ui.gwUnknown", hint: "ui.gwUnknownHint", action: null },
  absent: { tone: "warning", label: "ui.gwAbsent", hint: "ui.gwAbsentHint", action: "ui.gwEnrol" },
  pending: { tone: "warning", label: "ui.gwPending", hint: "ui.gwPendingHint", action: "ui.gwCheck" },
  active: { tone: "success", label: "ui.gwActive", hint: "ui.gatewayHint", action: null },
  expiring: { tone: "warning", label: "ui.gwExpiring", hint: "ui.gwExpiringHint", action: "ui.gwRenew" },
  expired: { tone: "danger", label: "ui.gwExpired", hint: "ui.gwExpiredHint", action: "ui.gwRenew" }
};
var TABS = ["delegated", "own"];
var ErpVerifactuConfig = class extends i3 {
  constructor() {
    super(...arguments);
    this.tab = "delegated";
    this.cert = null;
    this.transmission = null;
    this.loading = true;
    this.issuerNif = "";
    this.issuerName = "";
    this.business = {
      street: "",
      number: "",
      city: ""
    };
    this.gateway = null;
    this.gatewayLoading = true;
    this.enrolling = false;
    this.gatewayNotice = null;
    this.onPopState = () => this.serveHash();
    this.onLocaleChange = () => this.requestUpdate();
    this.pickedFile = null;
    this.password = "";
    this.busy = false;
    this.notice = null;
  }
  static {
    this.styles = i`
    :host { display:block; height:100%; overflow:auto; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .wrap { padding: .75rem; display:flex; flex-direction:column; gap:.75rem; }
    .card { background: var(--ion-card-background, #fff); border:1px solid var(--ion-border-color, #e6e2d8); border-radius: var(--ok-radius, 12px); overflow:hidden; }
    .card-body { padding: .85rem; display:flex; flex-direction:column; gap:.6rem; }
    h2 { margin:0; font-size:1.05rem; }
    h3 { margin:0; font-size:.95rem; }
    .hint { font-size:.82rem; color: var(--ion-color-medium, #6b7280); margin:0; }
    .kv { display:flex; gap:.4rem; flex-wrap:wrap; align-items:baseline; }
    .kv .k { font-size:.75rem; color: var(--ion-color-medium, #6b7280); }
    .row { display:flex; align-items:center; justify-content:space-between; gap:.75rem; }
    .actions { display:flex; gap:.5rem; flex-wrap:wrap; }
    ion-button { min-height:44px; }
    ion-input, ion-select { min-height:44px; }
    ok-inline-feedback { display:block; }
    ok-dropzone { --ok-dropzone-max-width: 100%; }
    .cert { display:flex; flex-direction:column; gap:.4rem; width:100%; padding:.25rem 0; }
    .cert-head { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; }
    .cert-head ion-label { margin:0; }
  `;
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    window.addEventListener("popstate", this.onPopState);
    this.serveHash();
    await this.refresh();
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    window.removeEventListener("popstate", this.onPopState);
    super.disconnectedCallback();
  }
  /** Abre la pestaña que nombre el hash. Uno que no conocemos abre la primera, no un hueco. */
  serveHash() {
    const hash = (globalThis.location?.hash ?? "").replace(/^#/, "");
    this.tab = TABS.includes(hash) ? hash : "delegated";
  }
  /** Cambia de pestaña y lo escribe en la dirección, para que se pueda compartir y volver. */
  goTab(tab) {
    this.tab = tab;
    const { pathname, search } = globalThis.location;
    window.history.pushState({}, "", `${pathname}${search}#${tab}`);
  }
  /**
   * Lee el estado del certificado y la vía que dice el CORE.
   *
   * El interruptor sale de `route_of`, **nunca** de `has_certificate`: desde hub#1489 ese 0/1
   * responde «¿tiene este hub una VÍA?» y vale 1 en las dos, así que un negocio sin ningún
   * certificado leería que tiene el suyo.
   */
  async refresh() {
    this.loading = true;
    const [certReply, rows, cfgRows, settingsReply] = await Promise.all([
      coreFetch(CERTIFICATE_PATH),
      erplora2().query("hub.fiscal.transmission").catch(() => null),
      erplora2().query("verifactu.config.get").catch(() => []),
      coreFetch(SETTINGS_PATH)
    ]);
    const settings = settingsReply.ok ? settingsReply.body : {};
    const text = (v3) => typeof v3 === "string" ? v3 : "";
    this.business = {
      street: text(settings.business_street),
      number: text(settings.business_street_number),
      city: text(settings.business_city)
    };
    const cfg = Array.isArray(cfgRows) ? cfgRows[0] ?? {} : {};
    this.issuerNif = String(cfg.issuer_nif ?? "");
    this.issuerName = String(cfg.issuer_name ?? "");
    const envelope = certReply.body;
    this.cert = certReply.ok ? envelope?.data ?? null : null;
    this.transmission = Array.isArray(rows) ? rows[0] ?? null : rows;
    this.loading = false;
    if (this.usesGatewayIdentity) await this.loadGatewayIdentity();
    else this.gatewayLoading = false;
  }
  /** Los textos de la zona de subida en el idioma de quien mira (el componente trae inglés). */
  dropzoneLabels(t5) {
    return {
      title: t5("ui.dropTitle"),
      browse: t5("ui.dropBrowse"),
      errorType: t5("ui.dropErrorType"),
      errorSize: t5("ui.dropErrorSize"),
      removeLabel: t5("ui.dropRemove")
    };
  }
  /**
   * **Does the fiscal cell speak for this hub?** — ONE rule for the two places that ask it (the
   * read on open and the section itself), because a screen that fetches what it never paints is
   * how a pointless call to the core survives a review.
   *
   * The machine identity is what the cell presents when it files IN THE NAME of the business
   * (ADR-0320 §1 / ADR-0419); a hub holding its own `.p12` reaches the AEAT by itself and its
   * identity takes part in nothing, so showing it there is technical noise on a business screen.
   *
   * Hidden ONLY when the core has SAID `own`, never «shown only when it said `delegated`»: a
   * runtime that does not publish `hub.fiscal.transmission` can perfectly well be on the cell, and
   * hiding the section from it would take away its only way to enrol (verifactu#82).
   */
  get usesGatewayIdentity() {
    return (this.transmission?.transmission_route ?? "").trim() !== ROUTE_OWN;
  }
  /**
   * Reads this hub's MACHINE identity from the core route (hub#1457).
   *
   * A failure lands in `gateway = null` and NOT in `this.error`: that slot belongs to the whole
   * screen, and a side read must not blank out the configuration the owner came here to change.
   * The section says «not available» in its own place, where a person can act on it.
   */
  async loadGatewayIdentity() {
    this.gatewayLoading = true;
    const reply = await gatewayFetch(GATEWAY_IDENTITY_PATH, "GET");
    this.gateway = reply.ok ? reply.body : null;
    this.gatewayLoading = false;
  }
  /**
   * Asks the hub to enrol: it files the CSR in this hub's legal-document file at the control plane
   * with its machine credential and collects the certificate once a person has signed it.
   *
   * Idempotent by contract — pressing it while a request is pending does not open a second review
   * (the control plane deduplicates the same bytes) and, once approved, it installs. So the ONE
   * button covers «request», «check» and «renew»; three buttons for one call would be three ways
   * of spending the same allowance.
   *
   * The answer carries the fresh status in the same body, so the row updates from what the door
   * just said rather than from a second round trip.
   */
  async enrolGateway() {
    this.enrolling = true;
    this.gatewayNotice = null;
    try {
      const reply = await gatewayFetch(GATEWAY_ENROL_PATH, "POST");
      const body = reply.body;
      if (reply.ok) {
        const outcome = enrolOutcome(typeof body.state === "string" ? body.state : "");
        const reason = typeof body.rejected_reason === "string" ? body.rejected_reason : "";
        this.gatewayNotice = { ...outcome, detail: reason, mono: false };
        this.gateway = body;
        return;
      }
      const code = typeof body.code === "string" ? body.code : "";
      const key = reply.status === 401 || reply.status === 403 ? "ui.gwErrNotAdmin" : code ? refusalKey(code) : "ui.gwErrHttp";
      this.gatewayNotice = { key, tone: "danger", detail: code, mono: true };
    } finally {
      this.enrolling = false;
    }
  }
  /**
     * **The secure connection with ERPlora** (verifactu#76): what this hub's MACHINE identity is, and
     * the one thing there is to do about it.
     *
     * That identity is what lets the fiscal cell file on the business's behalf (ADR-0320 §1): the
     * private key is born on the hub and never leaves it (ADR-0419), the CSR travels, and an operator
     * signs it with the internal CA — offline, so a person is always in the loop. Until hub#1457 both
     * legs were a human errand; the screen is the half that was still missing.
     *
     * There is deliberately NO way to forget the identity from here. `DELETE …/gateway-identity`
     * exists and is the operator's rotation path, but it destroys the private key: a module screen
     * must not be able to shut a business's road to the tax authority with one press.
     */
  renderGatewayIdentity(t5) {
    const state = this.gatewayLoading ? null : gatewayState(this.gateway, Date.now());
    const row = state ? GATEWAY_STATES[state] : { tone: "neutral", label: "ui.gwLoading", hint: "ui.gatewayHint", action: null };
    const commonName = (this.gateway?.common_name ?? "").trim();
    const validUntil = state === "active" || state === "expiring" || state === "expired" ? (this.gateway?.not_after ?? "").trim() : "";
    const notice = this.gatewayNotice;
    return b2`<ion-item lines="none">
      <div class="cert">
        <div class="cert-head">
          <ion-label>${t5("ui.gatewayTitle")}</ion-label>
          <ok-status-pill dot tone=${row.tone} label=${t5(row.label)}></ok-status-pill>
        </div>
        <p class="hint">${t5(row.hint)}</p>
        ${commonName ? b2`<div class="kv"><span class="k">${t5("ui.gatewayCommonName")}</span><code>${commonName}</code></div>` : A}
        ${validUntil ? b2`<div class="kv"><span class="k">${t5("ui.gatewayValidUntil")}</span><code>${validUntil}</code></div>` : A}
        ${row.action ? b2`<ion-button
              size="small"
              fill="outline"
              data-testid="gateway-enrol"
              ?disabled=${this.enrolling}
              @click=${() => this.enrolGateway()}
            >${this.enrolling ? t5("ui.gwWorking") : t5(row.action)}</ion-button>` : A}
        ${notice ? b2`<ok-inline-feedback tone=${notice.tone} icon="shield-checkmark-outline">
              ${t5(notice.key)}
              ${notice.detail ? notice.mono ? b2` <code>${notice.detail}</code>` : b2` ${notice.detail}` : A}
            </ok-inline-feedback>` : A}
      </div>
    </ion-item>`;
  }
  /** La fecha de subida en el idioma de quien mira, o `''` si no hay ninguna que enseñar. */
  uploadedLabel() {
    const raw2 = (this.cert?.uploaded_at ?? "").trim();
    if (!raw2) return "";
    const d3 = new Date(raw2);
    return Number.isNaN(d3.getTime()) ? raw2 : d3.toLocaleDateString(erplora2().locale || void 0);
  }
  /**
   * **Mi certificado** — subirlo, verlo y quitarlo. Nada más.
   *
   * El interruptor de la vía vive en Ajustes: eso se enciende y se apaga. Esto se hace una vez.
   */
  renderOwnTab(t5) {
    const present = !!this.cert?.present;
    return b2`<div class="card">
      <div class="card-body">
        <div class="row">
          <h3>${t5("ui.cfgP12Title")}</h3>
          <ok-status-pill
            dot
            tone=${present ? "success" : "neutral"}
            label=${present ? t5("ui.cfgP12Present") : t5("ui.cfgP12Absent")}
          ></ok-status-pill>
        </div>
        ${present ? b2`<div class="kv">
              <span class="k">${t5("ui.cfgP12Holder")}</span>
              <code>${this.cert?.subject || "\u2014"}</code>
              ${this.uploadedLabel() ? b2`<span class="k">${t5("ui.cfgP12Uploaded")} ${this.uploadedLabel()}</span>` : A}
            </div>` : A}
        <p class="hint">${t5("ui.cfgP12Hint")}</p>
        <!-- El mismo control de subida que el otorgamiento: arrastrar o elegir, con el tipo filtrado
             en la zona. Un input nativo pintaba el texto del navegador, en inglés. -->
        <ok-dropzone
          data-testid="config-p12-file"
          accept=".p12,.pfx"
          max-size=${MAX_CERTIFICATE_BYTES}
          hint=${t5("ui.cfgP12Choose")}
          .labels=${this.dropzoneLabels(t5)}
          @ok-change=${(e6) => {
      this.pickedFile = e6.detail?.files?.[0] ?? null;
    }}
        ></ok-dropzone>
        <ion-input
          type="password"
          mode="md"
          fill="outline"
          label-placement="floating"
          data-testid="config-p12-password"
          label=${t5("ui.cfgP12Password")}
          @ionInput=${(e6) => {
      this.password = String(e6.target.value ?? "");
    }}
        ></ion-input>
        ${this.notice ? b2`<ok-inline-feedback tone=${this.notice.tone} icon="information-circle-outline"
            >${t5(this.notice.key)}</ok-inline-feedback>` : A}
        <div class="actions">
          <ion-button ?disabled=${this.busy} @click=${() => void this.uploadCertificate()}>
            ${t5(this.busy ? "ui.cfgP12Uploading" : "ui.cfgP12Upload")}
          </ion-button>
          ${present ? b2`<ion-button
                fill="outline"
                color="danger"
                data-testid="config-p12-remove"
                ?disabled=${this.busy}
                @click=${() => void this.removeCertificate()}
              >${t5("ui.cfgRemoveConfirm")}</ion-button>` : A}
        </div>
      </div>
    </div>`;
  }
  /**
   * Sube el `.p12` por la puerta del core. La clave se queda ahí: lo que vuelve es el estado —
   * presencia, sujeto y fecha—, nunca los bytes.
   */
  async uploadCertificate() {
    if (!this.pickedFile) {
      this.notice = { key: "ui.cfgP12NoFile", tone: "warning" };
      return;
    }
    this.busy = true;
    this.notice = null;
    try {
      const b64 = await fileToBase64(this.pickedFile);
      const reply = await coreFetch(CERTIFICATE_PATH, {
        method: "PUT",
        json: { pkcs12_b64: b64, password: this.password }
      });
      if (!reply.ok) {
        const error = reply.body.error;
        const code = typeof error === "object" ? error?.code ?? "" : "";
        this.notice = {
          key: code === "capability_denied" ? "ui.cfgP12Denied" : "ui.cfgP12Error",
          tone: "danger"
        };
        return;
      }
      this.notice = { key: "ui.cfgP12Uploaded", tone: "success" };
      this.pickedFile = null;
      this.password = "";
      await this.refresh();
    } finally {
      this.busy = false;
    }
  }
  /** Quita el certificado del negocio y devuelve el hub a la vía delegada. */
  async removeCertificate() {
    this.busy = true;
    try {
      const reply = await coreFetch(CERTIFICATE_PATH, { method: "DELETE" });
      this.notice = reply.ok ? { key: "ui.cfgP12Removed", tone: "success" } : { key: "ui.cfgP12Error", tone: "danger" };
      if (reply.ok) await this.refresh();
    } finally {
      this.busy = false;
    }
  }
  /**
   * El otorgamiento: en qué estado está y qué toca hacer.
   *
   * El estado sale del CORE (`hub.fiscal.transmission`), que es el mismo sitio del que sale la
   * decision de `go_live`: dos lecturas separadas del mismo hecho es como acaban discrepando la
   * pantalla y la puerta de produccion.
   */
  /**
   * **Lo remite ERPlora** — y para eso hay que subirle el otorgamiento firmado. El panel es el
   * mismo que vivía en Ajustes → Negocio del hub: mismas reglas, otro sitio.
   */
  renderDelegatedTab(t5) {
    return b2`<div class="card" data-testid="config-grant">
      <div class="card-body">
        <h3>${t5("ui.cfgGrantTitle")}</h3>
        <erp-verifactu-grant
          .obligadoNif=${this.issuerNif}
          .obligadoName=${this.issuerName}
          .businessStreet=${this.business.street}
          .businessNumber=${this.business.number}
          .businessCity=${this.business.city}
        ></erp-verifactu-grant>
      </div>
    </div>
    <!-- La identidad de MAQUINA con la que la celda remite en nombre del negocio (verifactu#76). Va
         en esta pestaña porque es la otra mitad de lo que le permite a ERPlora remitir por ti, y no
         aparece en la via propia (verifactu#82): ahi el hub llega solo a la AEAT. -->
    ${this.usesGatewayIdentity ? b2`<div class="card"><div class="card-body">${this.renderGatewayIdentity(t5)}</div></div>` : A}`;
  }
  render() {
    const t5 = (k2) => erplora2().t(CATALOG2, k2);
    return b2`
      <div class="wrap">
        <h2>${t5("ui.cfgTitle")}</h2>
        <ion-segment
          value=${this.tab}
          @ionChange=${(e6) => this.goTab(String(e6.target.value))}
        >
          <ion-segment-button value="delegated" data-testid="config-tab-delegated">
            <ion-label>${t5("ui.cfgTabDelegated")}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="own" data-testid="config-tab-own">
            <ion-label>${t5("ui.cfgTabOwn")}</ion-label>
          </ion-segment-button>
        </ion-segment>
        ${this.tab === "delegated" ? this.renderDelegatedTab(t5) : this.renderOwnTab(t5)}
      </div>
    `;
  }
};
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "tab", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "cert", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "transmission", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "loading", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "issuerNif", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "issuerName", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "business", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "gateway", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "gatewayLoading", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "enrolling", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "gatewayNotice", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "pickedFile", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "password", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "busy", 2);
__decorateClass([
  r5()
], ErpVerifactuConfig.prototype, "notice", 2);
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}
define("erp-verifactu-config", ErpVerifactuConfig);

// lit-html/directive.js
var t3 = { ATTRIBUTE: 1, CHILD: 2, PROPERTY: 3, BOOLEAN_ATTRIBUTE: 4, EVENT: 5, ELEMENT: 6 };
var e5 = (t5) => (...e6) => ({ _$litDirective$: t5, values: e6 });
var i4 = class {
  constructor(t5) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t5, e6, i7) {
    this._$Ct = t5, this._$AM = e6, this._$Ci = i7;
  }
  _$AS(t5, e6) {
    return this.update(t5, e6);
  }
  update(t5, e6) {
    return this.render(...e6);
  }
};

// lit-html/directive-helpers.js
var { I: t4 } = j;
var i5 = (o7) => o7;
var s4 = () => document.createComment("");
var v2 = (o7, n6, e6) => {
  const l3 = o7._$AA.parentNode, d3 = void 0 === n6 ? o7._$AB : n6._$AA;
  if (void 0 === e6) {
    const i7 = l3.insertBefore(s4(), d3), n7 = l3.insertBefore(s4(), d3);
    e6 = new t4(i7, n7, o7, o7.options);
  } else {
    const t5 = e6._$AB.nextSibling, n7 = e6._$AM, c5 = n7 !== o7;
    if (c5) {
      let t6;
      e6._$AQ?.(o7), e6._$AM = o7, void 0 !== e6._$AP && (t6 = o7._$AU) !== n7._$AU && e6._$AP(t6);
    }
    if (t5 !== d3 || c5) {
      let o8 = e6._$AA;
      for (; o8 !== t5; ) {
        const t6 = i5(o8).nextSibling;
        i5(l3).insertBefore(o8, d3), o8 = t6;
      }
    }
  }
  return e6;
};
var u3 = (o7, t5, i7 = o7) => (o7._$AI(t5, i7), o7);
var m3 = {};
var p3 = (o7, t5 = m3) => o7._$AH = t5;
var M2 = (o7) => o7._$AH;
var h3 = (o7) => {
  o7._$AR(), o7._$AA.remove();
};

// lit-html/directives/repeat.js
var u4 = (e6, s5, t5) => {
  const r6 = /* @__PURE__ */ new Map();
  for (let l3 = s5; l3 <= t5; l3++) r6.set(e6[l3], l3);
  return r6;
};
var c4 = e5(class extends i4 {
  constructor(e6) {
    if (super(e6), e6.type !== t3.CHILD) throw Error("repeat() can only be used in text expressions");
  }
  dt(e6, s5, t5) {
    let r6;
    void 0 === t5 ? t5 = s5 : void 0 !== s5 && (r6 = s5);
    const l3 = [], o7 = [];
    let i7 = 0;
    for (const s6 of e6) l3[i7] = r6 ? r6(s6, i7) : i7, o7[i7] = t5(s6, i7), i7++;
    return { values: o7, keys: l3 };
  }
  render(e6, s5, t5) {
    return this.dt(e6, s5, t5).values;
  }
  update(s5, [t5, r6, c5]) {
    const d3 = M2(s5), { values: p4, keys: a3 } = this.dt(t5, r6, c5);
    if (!Array.isArray(d3)) return this.ut = a3, p4;
    const h4 = this.ut ??= [], v3 = [];
    let m4, y3, x2 = 0, j2 = d3.length - 1, k2 = 0, w2 = p4.length - 1;
    for (; x2 <= j2 && k2 <= w2; ) if (null === d3[x2]) x2++;
    else if (null === d3[j2]) j2--;
    else if (h4[x2] === a3[k2]) v3[k2] = u3(d3[x2], p4[k2]), x2++, k2++;
    else if (h4[j2] === a3[w2]) v3[w2] = u3(d3[j2], p4[w2]), j2--, w2--;
    else if (h4[x2] === a3[w2]) v3[w2] = u3(d3[x2], p4[w2]), v2(s5, v3[w2 + 1], d3[x2]), x2++, w2--;
    else if (h4[j2] === a3[k2]) v3[k2] = u3(d3[j2], p4[k2]), v2(s5, d3[x2], d3[j2]), j2--, k2++;
    else if (void 0 === m4 && (m4 = u4(a3, k2, w2), y3 = u4(h4, x2, j2)), m4.has(h4[x2])) if (m4.has(h4[j2])) {
      const e6 = y3.get(a3[k2]), t6 = void 0 !== e6 ? d3[e6] : null;
      if (null === t6) {
        const e7 = v2(s5, d3[x2]);
        u3(e7, p4[k2]), v3[k2] = e7;
      } else v3[k2] = u3(t6, p4[k2]), v2(s5, d3[x2], t6), d3[e6] = null;
      k2++;
    } else h3(d3[j2]), j2--;
    else h3(d3[x2]), x2++;
    for (; k2 <= w2; ) {
      const e6 = v2(s5, v3[w2 + 1]);
      u3(e6, p4[k2]), v3[k2++] = e6;
    }
    for (; x2 <= j2; ) {
      const e6 = d3[x2++];
      null !== e6 && h3(e6);
    }
    return this.ut = a3, p3(s5, v3), E;
  }
});

// lit-html/directives/style-map.js
var n5 = "important";
var i6 = " !" + n5;
var o6 = e5(class extends i4 {
  constructor(t5) {
    if (super(t5), t5.type !== t3.ATTRIBUTE || "style" !== t5.name || t5.strings?.length > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
  }
  render(t5) {
    return Object.keys(t5).reduce((e6, r6) => {
      const s5 = t5[r6];
      return null == s5 ? e6 : e6 + `${r6 = r6.includes("-") ? r6 : r6.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${s5};`;
    }, "");
  }
  update(e6, [r6]) {
    const { style: s5 } = e6.element;
    if (void 0 === this.ft) return this.ft = new Set(Object.keys(r6)), this.render(r6);
    for (const t5 of this.ft) null == r6[t5] && (this.ft.delete(t5), t5.includes("-") ? s5.removeProperty(t5) : s5[t5] = null);
    for (const t5 in r6) {
      const e7 = r6[t5];
      if (null != e7) {
        this.ft.add(t5);
        const r7 = "string" == typeof e7 && e7.endsWith(i6);
        t5.includes("-") || r7 ? s5.setProperty(t5, r7 ? e7.slice(0, -11) : e7, r7 ? n5 : "") : s5[t5] = e7;
      }
    }
    return E;
  }
});

// @erplora/outfitkit/dist/ok-data-table.js
var CSV_BOM = "\uFEFF";
var WINDOWS_1252_C1 = [
  8364,
  129,
  8218,
  402,
  8222,
  8230,
  8224,
  8225,
  710,
  8240,
  352,
  8249,
  338,
  141,
  381,
  143,
  144,
  8216,
  8217,
  8220,
  8221,
  8226,
  8211,
  8212,
  732,
  8482,
  353,
  8250,
  339,
  157,
  382,
  376
];
function decodeWindows1252(bytes) {
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte >= 128 && byte <= 159 ? WINDOWS_1252_C1[byte - 128] : byte);
  }
  return text;
}
function decodeCsvBuffer(buf) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    text = decodeWindows1252(new Uint8Array(buf));
  }
  return text.charCodeAt(0) === 65279 ? text.slice(1) : text;
}
var __defProp5 = Object.defineProperty;
var __decorateClass5 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp5(target, key, result);
  return result;
};
function decideRowActionsFit(input) {
  const { containerWidth, contentWidth, collapsed, decidedAtWidth } = input;
  if (!(containerWidth > 0)) return { collapsed, decidedAtWidth };
  if (containerWidth !== decidedAtWidth) {
    if (collapsed) return { collapsed: false, decidedAtWidth: containerWidth };
    return { collapsed: contentWidth > containerWidth, decidedAtWidth: containerWidth };
  }
  if (!collapsed && contentWidth > containerWidth) return { collapsed: true, decidedAtWidth };
  return { collapsed, decidedAtWidth };
}
var DEFAULT_LABELS3 = {
  search: "Search\u2026",
  empty: "No results",
  filters: "Filters",
  clear: "Clear",
  apply: "Apply",
  selected: "{n} selected",
  importCsv: "Import CSV",
  exportCsv: "Export CSV",
  add: "Add",
  moreActions: "More actions",
  rowsPerPage: "Rows per page",
  perPageShort: "{n} / page",
  viewList: "View as list",
  viewCards: "View as cards",
  columnsVisible: "Visible columns",
  columns: "Columns",
  actions: "Actions",
  close: "Close",
  newRecord: "New",
  form: "Form",
  filterPlaceholder: "Filter\u2026",
  from: "From",
  to: "To",
  fromOf: "{label} from",
  toOf: "{label} to",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "No values",
  selectAll: "Select all",
  selectRow: "Select row",
  select: "Select",
  showing: "Showing {from}\u2013{to} of",
  recordSingular: "record",
  recordPlural: "records",
  loadMore: "Load more"
};
var ES_LABELS = {
  search: "Buscar\u2026",
  empty: "Sin resultados",
  filters: "Filtros",
  clear: "Limpiar",
  apply: "Aplicar",
  selected: "{n} seleccionados",
  importCsv: "Importar CSV",
  exportCsv: "Exportar CSV",
  add: "A\xF1adir",
  moreActions: "M\xE1s acciones",
  rowsPerPage: "Filas por p\xE1gina",
  perPageShort: "{n} / p\xE1g.",
  viewList: "Vista lista",
  viewCards: "Vista tarjetas",
  columnsVisible: "Columnas visibles",
  columns: "Columnas",
  actions: "Acciones",
  close: "Cerrar",
  newRecord: "Nuevo",
  form: "Formulario",
  filterPlaceholder: "Filtrar\u2026",
  from: "Desde",
  to: "Hasta",
  fromOf: "{label} desde",
  toOf: "{label} hasta",
  gte: "\u2265",
  lte: "\u2264",
  noValues: "Sin valores",
  selectAll: "Seleccionar todo",
  selectRow: "Seleccionar fila",
  select: "Seleccionar",
  showing: "Mostrando {from}\u2013{to} de",
  recordSingular: "registro",
  recordPlural: "registros",
  loadMore: "Cargar m\xE1s"
};
var _OkDataTable = class _OkDataTable2 extends i3 {
  constructor() {
    super(...arguments);
    this.columns = [];
    this.rows = [];
    this.searchKeys = [];
    this.rowKeyField = "id";
    this.pageSize = 10;
    this.labels = {};
    this.actions = [];
    this.addable = false;
    this.pageSizeOptions = [10, 25, 50, 100];
    this.fill = false;
    this.columnPicker = true;
    this.csv = false;
    this.csvName = "export.csv";
    this.serverSide = false;
    this.total = 0;
    this.page = 0;
    this.searchable = false;
    this.sortDir = "asc";
    this.filterValues = {};
    this.title = "";
    this.views = false;
    this.exportable = false;
    this.importable = false;
    this.columnSelector = false;
    this.rowClickable = false;
    this.selectable = false;
    this.inlineFilters = false;
    this.menuActions = [];
    this.q = "";
    this.clientPage = 0;
    this.clientPageSize = 0;
    this.mobileShown = 0;
    this.clientSort = "";
    this.clientSortDir = "asc";
    this.clientFilters = {};
    this.filterDraft = {};
    this.serverFilters = {};
    this.panel = "none";
    this.viewMode = "table";
    this.viewChosenByUser = false;
    this.isMobile = false;
    this.xOverflow = false;
    this.actionsTrackPx = 0;
    this.rowActionsCollapsed = false;
    this.fitDecidedAtWidth = -1;
    this.rowMenuOpen = false;
    this.hiddenKeys = /* @__PURE__ */ new Set();
    this.internalSelection = /* @__PURE__ */ new Set();
    this.menuOpen = false;
    this.onLocaleChanged = () => this.requestUpdate();
    this.onWindowResize = () => {
      this.measureXOverflow();
      this.measureRowActionsFit();
    };
    this.onSearch = (ev) => {
      const value = ev.target.value ?? "";
      if (this.serverSide) {
        this.q = value;
        this.emit("searchChange", value);
      } else {
        this.q = value;
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    };
  }
  static {
    this.styles = i`
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* → --ion-* → hex */
      --background: var(--ok-surface, var(--ion-card-background, var(--ion-background-color, #ffffff)));
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --color-muted: var(--ok-muted, var(--ion-color-medium, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.55)));
      --border-color: var(--ok-border, var(--ion-color-step-150, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.12)));
      --border-color-soft: var(--ok-border-soft, var(--ion-color-step-100, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.07)));
      /* Borde más marcado para los controles de la toolbar (selects/pastilla de fechas), para que se
       * distingan como controles en claro y oscuro aunque el lienzo y la superficie casi no contrasten. */
      --control-border: color-mix(in srgb, var(--color) 22%, transparent);
      /* Relieve de cabecera/pie: step-100 (definido en claro y oscuro) → contraste con el lienzo. */
      --header-background: var(--ok-surface-2, var(--ion-color-step-100, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.04)));
      --row-hover: var(--ok-row-hover, var(--ion-color-step-50, rgba(var(--ion-text-color-rgb, 24, 24, 27), 0.03)));
      --primary: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --primary-contrast: var(--ok-primary-contrast, var(--ion-color-primary-contrast, #ffffff));
      --border-radius: var(--ok-radius, 16px);
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      display: block;
      color: var(--color);
      font-family: var(--font);
    }
    * { box-sizing: border-box; }
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      /* Flat: sin borde ni elevación (directiva 2026-06-09). */
      border: 0;
      border-radius: var(--border-radius);
      overflow: hidden;
      background: var(--background);
      box-shadow: none;
    }

    /* Panel lateral derecho (drawer) DENTRO de la tabla: filtros / alta-edición. Base (sin media):
       overlay absoluto — es lo que había hasta #75 y lo que ve un navegador sin media queries. */
    .tk-scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.18); z-index: 19; }
    .drawer { position: absolute; top: 0; right: 0; height: 100%; width: 340px; max-width: 88%;
      background: var(--background); border-left: 1px solid var(--border-color);
      display: flex; flex-direction: column; z-index: 20;
      animation: tk-slide-in 0.18s ease; }
    @keyframes tk-slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
    /* #75 — El panel EMPUJA en escritorio y es HOJA COMPLETA en móvil; nunca tapa a medias.
       Medido en el hub (Servicios/Citas): a 1440 el overlay de 340px se pintaba ENCIMA de
       «Duración», «Acciones» y el selector de columnas, con el 90% de la tabla vacío a la
       izquierda; a 390 dejaba una tira de 45px de tabla (media lupa, medio «Co…») que hacía
       parecer el formulario un pop-up mal puesto. Square Dashboard reduce la tabla con un panel
       fijo; Fresha/Shopify/Odoo abren una hoja a pantalla completa en móvil.
       ≥ 834px: mientras hay panel, .card pasa a rejilla de DOS columnas (tabla | panel 360px):
       la tabla se estrecha (ya sabe hacer scroll-x, #67) y nada queda tapado. */
    @media (min-width: 834px) {
      .card.has-panel { display: grid; grid-template-columns: minmax(0, 1fr) 360px; grid-template-rows: auto minmax(0, 1fr) auto; }
      .card.has-panel > .bar { grid-column: 1; grid-row: 1; }
      .card.has-panel > .scroll, .card.has-panel > .cards-grid, .card.has-panel > .empty { grid-column: 1; grid-row: 2; min-height: 0; overflow: auto; }
      .card.has-panel > .pager { grid-column: 1; grid-row: 3; }
      .card.has-panel > .drawer { position: static; grid-column: 2; grid-row: 1 / -1; width: auto; max-width: none; height: auto; min-height: 0; animation: none; }
      .card.has-panel > .tk-scrim { display: none; }
    }
    /* < 834px: hoja a pantalla completa con su cabecera (título + Cerrar); sin tira residual.
       position:fixed dentro de ion-content se ancla al área de contenido (contain), que es justo el hueco
       bajo la cabecera de la app: el usuario conserva el título de la página. */
    @media (max-width: 833.98px) {
      .drawer { position: fixed; inset: 0; top: var(--ok-sheet-top, 0px); width: 100%; max-width: none; height: auto; border-left: 0; z-index: 1000; }
      .tk-scrim { display: none; }
    }
    .drawer .dh { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between;
      padding: 0.6rem 0.5rem 0.6rem 1rem; border-bottom: 1px solid var(--border-color); font-size: 1rem; }
    .drawer .db { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.85rem; }
    .fblock { display: flex; flex-direction: column; gap: 0.45rem; }
    .flabel { font-size: 13px; font-weight: 500; color: var(--color); }
    .frange { display: flex; gap: 0.5rem; }
    /* Filtros cliente: multi-select con ion-select (ventana flotante de Ionic) + rango de fechas. */
    .daterange { display: flex; gap: 0.6rem; }
    .daterange ion-input { flex: 1; }
    /* Pie del drawer de filtros: Limpiar / Aplicar. */
    .df { flex: 0 0 auto; display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; padding: 0.6rem 0.85rem; border-top: 1px solid var(--border-color); }
    .df .df-clear { margin-right: auto; }

    /* Modo fill: la tabla ocupa el alto del contenedor; filas con scroll interno; pager fijo. */
    :host([fill]) { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    :host([fill]) .card { flex: 1 1 auto; min-height: 0; }
    :host([fill]) .bar, :host([fill]) .panel, :host([fill]) .pager { flex: 0 0 auto; }
    :host([fill]) .scroll, :host([fill]) .cards-grid { flex: 1 1 auto; min-height: 0; overflow: auto; }
    /* Sin filas, renderTable/renderCards devuelven SOLO el bloque .empty (sin .scroll). En modo
       fill hay que estirarlo para que ocupe el hueco entre toolbar y pager y centre su contenido
       (icono + mensaje) en vertical; si no, queda pegado arriba con el pager a media altura. */
    :host([fill]) .empty { flex: 1 1 auto; min-height: 0; }

    /* ── Topbar / cabecera (relieve) ─────────────────────────────────────────────────────── */
    .bar { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.65rem 1rem; border-bottom: 1px solid var(--border-color); background: var(--header-background); }
    /* Toolbar CONSOLIDADA: TODOS los controles son hijos directos de UNA sola fila flex que
     * envuelve ELEMENTO A ELEMENTO (no por bloques): caben en una línea → una línea; los que no
     * caben bajan a la(s) línea(s) que hagan falta. El cluster derecho se empuja al borde con
     * .tk-spacer (hueco flexible) solo cuando todo cabe en una línea; al envolver, el spacer se
     * oculta y todo se apila a la izquierda.
     * ORDEN CANÓNICO (2026-06-22, izquierda→derecha): [buscador] · [filtros en línea] · ‹spacer› ·
     * [SELECTORES: columnas → filas/página] · [BOTONES: vistas → filtros(funnel) → import → export →
     * alta → ⋮ → acción primaria]. Es decir: buscador al inicio, filtros en medio, y al final los
     * selectores (columnas, luego «N por página») seguidos de los botones de acción. */
    .bar-main { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .bar-main > ion-button { --padding-start: 0.5rem; --padding-end: 0.5rem; margin: 0; }
    /* Spacer que absorbe el hueco libre en pantallas anchas (empuja el cluster derecho al borde).
     * Se oculta por debajo de 1024px para que, al envolver, los controles se apilen a la izquierda. */
    .tk-spacer { flex: 1 1 0; min-width: 0; align-self: stretch; }
    @media (max-width: 1024px) { .tk-spacer { display: none; } }
    /* Buscador a ancho completo (línea propia) en móvil; el resto envuelve debajo. */
    @media (max-width: 640px) { .search { flex-basis: 100%; max-width: none; } }
    .title-wrap { display: flex; align-items: baseline; gap: 0.5rem; }
    .title { font-size: 15px; font-weight: 600; line-height: 1; margin: 0; }
    .title-count { font-size: 12px; font-weight: 500; color: var(--color-muted); }

    /* Botón de herramienta cuadrado (filtros/import/export), look del Hub: 36×36, badge contador. */
    .toolbtn { position: relative; --padding-start: 0; --padding-end: 0; --border-radius: 10px; width: 36px; height: 36px; margin: 0; }
    .toolbtn .badge { position: absolute; top: -5px; right: -5px; min-width: 16px; height: 16px; padding: 0 3px; border-radius: 999px; background: var(--primary); color: var(--primary-contrast); font-size: 10px; font-weight: 700; line-height: 16px; text-align: center; pointer-events: none; }

    /* Buscador (caja con icono + limpiar), look del Hub. No crece (el spacer se queda el hueco);
     * puede encoger hasta min-width y, por debajo, envuelve. */
    .search { flex: 0 1 22rem; min-width: 12rem; max-width: 24rem; }
    ion-searchbar { --background: var(--background); --border-radius: 10px; padding: 0; min-height: 36px; }
    /* Flat: el buscador quita borde y elevación vía la clase específica de Ionic 'ion-no-border'.
     * (La regla global de Ionic para .ion-no-border no cruza el Shadow DOM, así que la
     * reimplementamos aquí dentro: --box-shadow controla la elevación; ::part(native) el borde.) */
    ion-searchbar.ion-no-border { --box-shadow: none; }
    ion-searchbar.ion-no-border::part(native) { border: none; box-shadow: none; }

    /* Toggle de vista lista/tarjetas (segmento) */
    .viewseg { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border: 1px solid var(--border-color); border-radius: 10px; background: var(--background); }
    .viewseg ion-button { --border-radius: 7px; }

    /* Botón primario (primaryAction) */
    .primary-btn { --background: var(--primary); --color: var(--primary-contrast); }
    /* #76 — El alta en MÓVIL: botón primario CON etiqueta y área táctil de 44px, en vez del «+»
       icónico de 36px al final de la barra. Fresha/Square/Shopify POS ponen la acción primaria
       de la lista como botón visible con texto (o FAB), nunca como icono anónimo.
       #113 — Y en ESCRITORIO igual: Odoo («New»), Business Central, Shopify («Add product»),
       WooCommerce, Lightspeed y Fresha rotulan y rellenan la acción principal de un listado; NN/g
       reserva el botón sin rótulo para lo universal (buscar, cerrar). Aquí solo cambia la ALTURA:
       36px para alinear con .toolbtn y el buscador, y los 44px táctiles vuelven abajo con el
       resto de objetivos de puntero grueso. */
    .add-btn { min-height: 36px; --border-radius: 10px; --padding-start: 0.9rem; --padding-end: 1rem; margin: 0; font-weight: 600; }
    .add-btn ion-icon { margin-inline-end: 0.35rem; }

    /* Selects de la toolbar: fondo + borde visibles (como el buscador y la pastilla de fechas) para
     * que se distingan como controles en claro y oscuro (sin fondo eran invisibles en dark). */
    .tk-cols { min-width: 6.5rem; max-width: 9rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.6rem; --padding-end: 0.4rem; --padding-top: 0.3rem; --padding-bottom: 0.3rem; }
    .vsep { width: 1px; align-self: stretch; background: var(--border-color); margin: 0.3rem 0.25rem; }

    /* Selector de filas/página en la toolbar (consolidado) */
    /* max-width: ion-select es display:block (sin core.css el host estira a la
     * línea entera cuando .bar-end hace wrap) — se capa como .tk-cols. */
    .tk-psize { min-width: 4.25rem; max-width: 5.5rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.6rem; --padding-end: 0.4rem; --padding-top: 0.35rem; --padding-bottom: 0.35rem; }

    /* Filtros EN LÍNEA en la toolbar (select / rango de fechas) */
    .tk-filter { min-width: 8.5rem; max-width: 13rem; min-height: 38px; font-size: 13px; background: var(--background); color: var(--color); border: 1px solid var(--control-border); border-radius: 10px; --padding-start: 0.7rem; --padding-end: 0.5rem; --padding-top: 0.35rem; --padding-bottom: 0.35rem; }
    .tk-daterange { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.6rem; min-height: 38px; border: 1px solid var(--control-border); border-radius: 10px; background: var(--background); color: var(--color-muted); font-size: 13px; }
    .tk-daterange ion-icon { font-size: 15px; flex: 0 0 auto; }
    .tk-daterange ion-input { --background: transparent; --padding-start: 0; --padding-end: 0; --padding-top: 2px; --padding-bottom: 2px; --color: var(--color); min-height: 26px; width: 6.8rem; font-size: 13px; }
    .tk-daterange .arr { color: var(--color-muted); }

    /* Barra contextual de selección */
    .selbar { display: flex; align-items: center; gap: 0.6rem; padding: 0.4rem 0.7rem; border-radius: 10px;
      font-size: 13px; color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .selbar .sel-clear { margin-left: auto; display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer; font-weight: 500; color: inherit; background: none; border: 0; font: inherit; }
    .selbar .sel-clear:hover { text-decoration: underline; }

    /* Acordeones (alta / filtros en modo tarjetas) */
    .panel { padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-color); background: var(--header-background); }
    .filters-panel { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.6rem; }

    /* ── Vista lista en CSS GRID (no <table>): permite ancho por columna ──────────────────── */
    /* #67 — La barra horizontal es PERMANENTE cuando hay desbordamiento: la overlay de macOS se
       esconde a los pocos ms y deja la tabla sin ninguna pista de que sigue a la derecha. Al
       declarar ::-webkit-scrollbar el navegador pinta la clásica, que ocupa sitio y se ve. */
    .scroll { overflow-x: auto; }
    .scroll::-webkit-scrollbar { height: 10px; }
    .scroll::-webkit-scrollbar-track { background: transparent; }
    .scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--color) 25%, transparent); border-radius: 6px; }
    .scroll::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--color) 40%, transparent); }
    /* #120 - The grid floor is the SUM OF THE COLUMN MINIMUMS (min-content), not its maximum
       size. With max-content the grid sizes itself to what the widest column asks for and, in
       doing so, every 1fr track ends up as wide AS THAT ONE: at 834px each column measured
       148.86px for content asking between 10px (a "4") and 100px ("Familia Perez"). The table
       always overflowed and the pinned actions column sat on top of Pax and Estado. With
       min-content the grid fits its container as long as the minimums fit, and 1fr shares out the
       leftover space; horizontal scroll shows up only when not even the minimums fit. */
    .grid { min-width: min-content; font-size: 14px; }
    .grow { display: grid; align-items: center; gap: 0.5rem; padding: 0 1rem; }
    .ghead { position: sticky; top: 0; z-index: 2; border-bottom: 1px solid var(--border-color);
      background: var(--header-background); padding-top: 0.55rem; padding-bottom: 0.55rem; }
    .gcell { display: flex; align-items: center; min-width: 0; }
    .gcell > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .gcell.right { justify-content: flex-end; text-align: right; }
    .gcell.center { justify-content: center; text-align: center; }
    /* #67 - PINNED ACTIONS COLUMN. When the grid overflows (since #120 only when not even the
       column minimums fit; before that it happened with six columns and room to spare) the button
       that opens the record went off screen: at 1440px it sat 335px past the edge with nothing to
       give it away. It stays stuck to the right edge, like Zendesk/Freshdesk/Shopify. With
       background:inherit it takes the row background (which is opaque for this very reason), so it
       keeps hover and selection without anything showing through. */
    .gcell.actions-col { position: sticky; right: 0; z-index: 1; background: inherit;
      margin-right: -1rem; padding-right: 1rem; }
    /* La sombra solo aparece cuando de verdad hay algo escondido a la izquierda (clase x-overflow);
       si la tabla cabe entera no se pinta nada. */
    .scroll.x-overflow .gcell.actions-col { box-shadow: -10px 0 10px -10px color-mix(in srgb, var(--color) 45%, transparent); }
    /* #120 - The pinned header has to be OPAQUE. background:inherit took --header-background,
       which is a 4% alpha TINT (measured rgba(24,24,27,0.04)): when the grid overflows the
       "Acciones" header went see-through and "PAX" and "ESTADO" could be read through it - the
       "PAXCIONESTAD" of the issue. It now sits on the opaque table background with the tint laid
       back on top, the same way .grow-data:hover does. */
    .ghead .gcell.actions-col { z-index: 3;
      background: linear-gradient(var(--header-background), var(--header-background)), var(--background); }
    .gh { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); }
    .gh.sortable { cursor: pointer; user-select: none; white-space: nowrap; transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease), transform 120ms ease; }
    @media (hover: hover) {
      .gh.sortable:hover { color: var(--color); }
    }
    /* Caret de orden (3 estados, icono Ionic): neutral atenuado / activo en color primario. */
    .caret { display: inline-flex; align-items: center; margin-left: 0.25rem; flex: 0 0 auto; font-size: 13px; opacity: 0.3; }
    .caret.on { opacity: 1; color: var(--primary); }
    .grow-data { background: var(--background); border-bottom: 1px solid var(--border-color-soft); padding-top: 0.6rem; padding-bottom: 0.6rem; transition: background-color var(--ok-transition, 150ms ease), color var(--ok-transition, 150ms ease), box-shadow var(--ok-transition, 150ms ease), transform 120ms ease; }
    .grow-data:last-child { border-bottom: 0; }
    @media (hover: hover) {
      .grow-data:hover { background: linear-gradient(var(--row-hover), var(--row-hover)), var(--background); }
    }
    .grow-data:active { transform: scale(0.995); }
    .grow-data.selected { background: linear-gradient(color-mix(in srgb, var(--primary) 10%, transparent), color-mix(in srgb, var(--primary) 10%, transparent)), var(--background); }
    /* #67 — Fila clicable (opt-in row-clickable): es lo primero que intenta el usuario y lo que
       hacen Odoo, Jira SM, Shopify o Square en sus listados. */
    .grow-data.clickable { cursor: pointer; }
    .grow-data.clickable:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
    .selcb { display: flex; align-items: center; justify-content: center; }
    .filters-grow { padding-top: 0.4rem; padding-bottom: 0.6rem; }
    .filters-grow input, .filters-grow select { width: 100%; box-sizing: border-box; font: inherit; font-size: 13px; padding: 0.3rem 0.4rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background); color: var(--color); }
    .range { display: flex; gap: 0.25rem; }

    /* ── Vista tarjetas ──────────────────────────────────────────────────────────────────── */
    /* Cada tarjeta mide SU contenido (no se estira al alto de la fila ni del contenedor):
       - grid-auto-rows: max-content → cada fila implícita = alto de su contenido. CLAVE: sin esto,
         en modo fill (grid de alto fijo + align-content:start) cuando las tarjetas no caben el
         navegador encoge los tracks de fila y las tarjetas se solapan.
       - align-content: start → empaqueta las filas arriba (no reparte el hueco sobrante estirando).
       - align-items: start → en una fila multi-columna cada tarjeta mide su propio contenido.
       En modo fill el grid es flex-child con overflow:auto → cuando las tarjetas no caben aparece el
       scroll DENTRO de la tabla (no crece hacia fuera). */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 0.75rem; padding: 1rem; grid-auto-rows: max-content; align-content: start; align-items: start; }
    /* Tarjeta = ion-card NATIVO de Ionic: su fondo, radio, elevación y padding son los de Ionic y NO
       se sobrescriben. Aquí solo se ajusta lo que el contexto de rejilla exige (margin) y los huecos
       que Ionic no trae (cabecera en fila, filas clave-valor, barra de acciones, resalte de selección). */
    ion-card.rcard { margin: 0; } /* la rejilla aporta el gap → sin esto el margin por defecto de ion-card lo duplica */
    ion-card.rcard.selected { outline: 2px solid var(--primary); outline-offset: -2px; }
    /* #74 — Tarjeta clicable (opt-in row-clickable): la mitad de #67 que faltaba. La vista de
       tarjetas es la que la tabla elige SOLA en móvil, así que sin esto el registro no se podía
       abrir desde un teléfono (medido con combos 0.1.4: 0 rowClick a 390px). */
    ion-card.rcard.clickable { cursor: pointer; }
    ion-card.rcard.clickable:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
    @media (prefers-reduced-motion: reduce) {
      .gh.sortable:hover, .gh.sortable:active,
      .grow-data:hover, .grow-data:active { transform: none; }
    }
    /* Header: ion-card-header as a single row (icon + title + checkbox), keeping Ionic's padding.
       #79 — flex-direction/flex-wrap are SPELLED OUT on purpose: in ios mode (the mode the Hub
       shell pins, ADR-0143) Ionic's own host CSS gives ion-card-header a column direction, so a
       rule that only sets display:flex inherits it and the three children stack on three lines.
       Under md the same rule looked right, which is why it shipped. */
    ion-card-header.rcard-head { display: flex; flex-direction: row; flex-wrap: nowrap; align-items: center; gap: 0.5rem; }
    .rcard-head .rc-icon { display: inline-flex; color: var(--primary); }
    .rcard-head .rc-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
    /* Cuerpo: ion-card-content (padding Ionic por defecto) con las filas clave-valor apiladas. */
    ion-card-content.rcard-body { display: flex; flex-direction: column; gap: 0.4rem; }
    .rrow { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 13px; }
    .rrow .rk { color: var(--color-muted); }
    .rrow .rv { font-weight: 500; text-align: right; color: var(--color); }
    /* Barra de acciones (Ionic no trae "card actions"): pie alineado a la derecha, fondo transparente. */
    .ractions { display: flex; justify-content: flex-end; gap: 0.25rem; padding: 0 0.5rem 0.5rem; }
    /* ERPlora/appointments#154 - a card's action row must NEVER clip.
       The assumption was that they always fit across the card. With the eight actions an
       appointment carries they do not: on a 411dp phone the card leaves 363px and the buttons ask
       for 380px (8 x 44px of tap floor + 7 gaps of 4px). Without wrapping, justify-content:
       flex-end takes that difference off the START side, so the FIRST button - Cobrar - hung off
       the left edge of the card, clipped, with no scrollbar and nothing to say it was there.
       The wrap is scoped to the card on purpose: the LIST view's row is measured by its
       scrollWidth to pin the column track (#121), and a row that wraps changes width with the
       track it is measured against, which is the loop that measure avoids. */
    .ractions .actions { flex-wrap: wrap; }

    /* ── Estado vacío ────────────────────────────────────────────────────────────────────── */
    .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; padding: 3.5rem 1rem; text-align: center; color: var(--color-muted); }
    .empty .empty-ic { display: grid; place-items: center; width: 3.25rem; height: 3.25rem; border-radius: 999px; background: var(--header-background); font-size: 26px; }

    .actions { display: flex; gap: 0.25rem; justify-content: flex-end; }
    /* #121 - The buttons NEVER shrink. Their track is pinned to the width measured here
       (the scrollWidth of .actions); if they could shrink, a narrow track would shrink the
       measurement, which would shrink the track again. flex: 0 0 auto is what makes the
       measurement a property of the CONTENT instead of a property of the current layout. */
    .actions ion-button { flex: 0 0 auto; }
    /* #122 - Header of the actions column while the buttons are folded into the menu. "ACCIONES"
       measures 62.83px and the folded track is 44px: painted, it spills out of its own cell and
       over "Estado" - the very thing the issue is about. The column keeps its name for assistive
       tech and paints nothing. */
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip-path: inset(50%); white-space: nowrap; border: 0; }
    /* Las acciones de fila son icon-only y de tamaño small en escritorio. En tablet/móvil se
     * amplía el host completo (no solo el icono) para que el área táctil alcance 44×44 px. */
    @media (pointer: coarse), (max-width: 834px) {
      .actions ion-button { min-width: 44px; min-height: 44px; margin: 0; }
      .toolbtn { width: 44px; height: 44px; }
      .add-btn { min-height: 44px; }
      .pager .nav ion-button { min-width: 44px; min-height: 44px; margin: 0; }
    }
    /* Spinner de acción en curso (loading): contenido dentro del ion-button small (Ionic lo fija
     * a 28px en el :host, por eso width/height y no font-size). Cubre tabla y tarjetas: los
     * botones de fila siempre van dentro de .actions. */
    .actions ion-spinner { width: 18px; height: 18px; }

    /* ── Pie: contador + paginación ──────────────────────────────────────────────────────── */
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.55rem 1rem; border-top: 1px solid var(--border-color); background: var(--header-background); font-size: 12.5px; color: var(--color-muted); }
    .pager .left { display: flex; align-items: center; gap: 0.6rem; }
    .pager .strong { font-weight: 600; color: var(--color); }
    .psize { font: inherit; font-size: 12.5px; padding: 0.2rem 0.35rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--background); color: var(--color); }
    .pager .nav { display: flex; align-items: center; gap: 0.2rem; }
    /* #78 — Pie en MÓVIL: un solo control «Cargar más» en lugar del pager numerado (Shopify
       IndexTable, Fresha, Square y Material hacen lo mismo: nadie pinta botones de página en un
       teléfono). Sin atributo fill: el sólido por defecto de Ionic es el único que pinta caja en
       modo ios (outfitkit#82 / ADR-0143). Los 44px son el área táctil mínima. */
    .pager .load-more { min-height: 44px; margin: 0; --padding-start: 1rem; --padding-end: 1rem; font-size: 13px; }
    .pager .nav .pp { font-weight: 600; color: var(--color); padding: 0 0.25rem; }
    /* Pager numerado: botón por página + «…» en los saltos (look del Hub). */
    /* #92 — min-width/height at 44px so a numbered page button matches the prev/next ion-button's
       own 44px tap target (line above): before this they were visibly smaller than their neighbors. */
    .pnum { min-width: var(--ok-tap-min, 44px); height: var(--ok-tap-min, 44px); padding: 0 0.4rem; border: 1px solid transparent; border-radius: 8px; background: none; font: inherit; font-size: 12.5px; font-weight: 600; color: var(--color); cursor: pointer; transition: background 0.12s, border-color 0.12s; }
    .pnum:hover { background: var(--row-hover); }
    .pnum.on { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); border-color: color-mix(in srgb, var(--primary) 40%, transparent); }
    .pgap { padding: 0 0.15rem; color: var(--color-muted); }
    ion-button { --box-shadow: none; }
  `;
  }
  static {
    this.MOBILE_BREAKPOINT = 640;
  }
  connectedCallback() {
    super.connectedCallback();
    if (typeof window !== "undefined") {
      window.addEventListener("erplora:locale-changed", this.onLocaleChanged);
      window.addEventListener("resize", this.onWindowResize);
    }
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      this.mq = window.matchMedia(`(max-width: ${_OkDataTable2.MOBILE_BREAKPOINT}px)`);
      this.isMobile = this.mq.matches;
      const handler = (e6) => {
        const matches = "matches" in e6 ? e6.matches : this.mq?.matches ?? false;
        if (this.isMobile === matches) return;
        this.isMobile = matches;
        if (matches && this.cardViewEnabled) this.viewMode = "cards";
        else if (!matches && this.viewMode === "cards") this.viewMode = "table";
      };
      this.mq.addEventListener("change", handler);
      this._mqHandler = handler;
    }
  }
  /** #67 — Recalcula si la vista lista desborda a lo ancho (`scrollWidth > clientWidth`).
   *
   * Se mide después de renderizar, que es cuando el navegador ya conoce los anchos, y solo se
   * escribe el estado si CAMBIA: asignarlo siempre reprogramaría un render en bucle. */
  measureXOverflow() {
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    const overflow = !!scroll && scroll.scrollWidth > scroll.clientWidth;
    if (this.xOverflow !== overflow) this.xOverflow = overflow;
  }
  /** #121 — Ancho natural de los botones de acción de una fila, para clavar su pista en px.
   *
   * Se lee del `scrollWidth` de `.actions`, que es el ancho de SU CONTENIDO: como los botones
   * llevan `flex: 0 0 auto` nunca se encogen, así que la medida no depende de lo ancha que sea la
   * pista en ese momento. Eso es lo que la hace estable: clavar la pista al ancho natural no
   * cambia el ancho natural, así que la siguiente medida sale igual y no hay bucle. */
  measureActionsTrack() {
    if (!this.actions.length) {
      if (this.actionsTrackPx !== 0) this.actionsTrackPx = 0;
      return;
    }
    const el = this.renderRoot?.querySelector?.(".grow-data .gcell.actions-col .actions");
    const width = el ? Math.ceil(el.scrollWidth) : 0;
    if (width > 0 && width !== this.actionsTrackPx) this.actionsTrackPx = width;
  }
  /** #122 — Decide si los botones de acción de la fila caben o se pliegan en el menú «⋮».
   *  El criterio y la garantía de que no oscila viven en `decideRowActionsFit`. */
  measureRowActionsFit() {
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    if (!scroll) return;
    const next = decideRowActionsFit({
      containerWidth: scroll.clientWidth,
      contentWidth: scroll.scrollWidth,
      collapsed: this.rowActionsCollapsed,
      decidedAtWidth: this.fitDecidedAtWidth
    });
    this.fitDecidedAtWidth = next.decidedAtWidth;
    if (this.rowActionsCollapsed !== next.collapsed) this.rowActionsCollapsed = next.collapsed;
  }
  /** Engancha el observador al contenedor de scroll del render actual (cambia entre vistas). */
  observeXOverflow() {
    if (typeof ResizeObserver === "undefined") return;
    const scroll = this.renderRoot?.querySelector?.(".scroll");
    if (!scroll) return;
    this.xObserver ??= new ResizeObserver(() => {
      this.measureXOverflow();
      this.measureActionsTrack();
      this.measureRowActionsFit();
    });
    this.xObserver.disconnect();
    this.xObserver.observe(scroll);
    const grid = scroll.querySelector(".grid");
    if (grid) this.xObserver.observe(grid);
  }
  updated(changed) {
    this.observeXOverflow();
    this.measureXOverflow();
    if (changed.has("columns") || changed.has("actions") || changed.has("hiddenKeys") || changed.has("selectable")) {
      this.fitDecidedAtWidth = -1;
    }
    this.measureActionsTrack();
    this.measureRowActionsFit();
    if (changed.has("panel")) this.syncSheetTop();
  }
  /** #75 — Where the mobile sheet starts. `position: fixed; inset: 0` painted it from y=0 and the
   *  app's `ion-header` (its own stacking context, above the content) covered the sheet's title and
   *  its only Close button — measured at 390×844 in the Appointments parity page. CSS inside a
   *  shadow root cannot know where the content area begins, so on open the table measures the
   *  closest `ion-content` (walking through shadow hosts) and hands the offset over as a custom
   *  property; on close it is removed. Without an `ion-content` around, the sheet keeps y=0. */
  syncSheetTop() {
    if (this.panel === "none") {
      this.style.removeProperty("--ok-sheet-top");
      return;
    }
    let node = this;
    let content = null;
    while (node && !content) {
      const parent = node.parentNode ?? node.getRootNode?.()?.host ?? null;
      if (parent && parent.nodeType === Node.ELEMENT_NODE && parent.tagName === "ION-CONTENT") content = parent;
      node = parent === node ? null : parent;
    }
    const top = content ? Math.max(0, Math.round(content.getBoundingClientRect().top)) : 0;
    this.style.setProperty("--ok-sheet-top", `${top}px`);
  }
  disconnectedCallback() {
    if (typeof window !== "undefined") {
      window.removeEventListener("erplora:locale-changed", this.onLocaleChanged);
      window.removeEventListener("resize", this.onWindowResize);
    }
    this.xObserver?.disconnect();
    this.xObserver = void 0;
    if (this.mq) {
      const handler = this._mqHandler;
      if (handler) this.mq.removeEventListener("change", handler);
      this.mq = void 0;
    }
    super.disconnectedCallback();
  }
  // ── i18n: idioma del documento ← overrides explícitos de `.labels` ─────────────────────────
  get t() {
    const lang = typeof document === "undefined" ? "en" : document.documentElement.lang.toLowerCase();
    return { ...lang.startsWith("es") ? ES_LABELS : DEFAULT_LABELS3, ...this.labels };
  }
  /** Placeholder efectivo del buscador (prop explícita → label i18n → default inglés). */
  get effSearchPlaceholder() {
    return this.searchPlaceholder ?? this.t.search;
  }
  /** Mensaje efectivo de estado vacío (prop explícita → label i18n → default inglés). */
  get effEmptyMessage() {
    return this.emptyMessage ?? this.t.empty;
  }
  // ── Resolución de alias (compat + documentados) ──────────────────────────────────────────
  get effPageSizes() {
    return this.pageSizes ?? this.pageSizeOptions;
  }
  get effColumnPicker() {
    return this.columnPicker || this.columnSelector;
  }
  get effExport() {
    return this.csv || this.exportable;
  }
  get effImport() {
    return this.csv || this.importable;
  }
  /** ¿Está habilitado el conmutador de vista lista/tarjetas? */
  get viewToggle() {
    if (Array.isArray(this.views)) return this.views.length > 1;
    return this.views === true;
  }
  /** ¿Está disponible la vista tarjetas? (presente en `views` o `views === true`). */
  get cardViewEnabled() {
    if (Array.isArray(this.views)) return this.views.some((v3) => v3 === "cards" || v3 === "card");
    return this.views === true;
  }
  /** Columnas actualmente visibles (respeta el column chooser). */
  get visibleColumns() {
    return this.hiddenKeys.size ? this.columns.filter((c5) => !this.hiddenKeys.has(c5.key)) : this.columns;
  }
  setVisibleColumns(keys) {
    const visible = new Set(keys);
    this.hiddenKeys = new Set(this.columns.map((c5) => c5.key).filter((k2) => !visible.has(k2)));
    this.emit("columnsChange", { visible: keys });
  }
  // ── Selección ─────────────────────────────────────────────────────────────────────────────
  keyOf(row) {
    if (typeof this.rowKey === "function") return String(this.rowKey(row) ?? "");
    if (typeof this.rowKey === "string") return String(row[this.rowKey] ?? "");
    return String(row[this.rowKeyField] ?? "");
  }
  /** #143 — `<prefix>-<suffix>`, or `nothing` (= the attribute is not painted) when the host gave
   *  no prefix. A blank prefix counts as absent: `" "` would leave dangling `-add` hooks, identical
   *  on every table of the screen, which is exactly what the prefix prevents. */
  tid(suffix) {
    const prefix = this.testid?.trim();
    return prefix ? `${prefix}-${suffix}` : A;
  }
  get selection() {
    return this.selectedKeys ?? this.internalSelection;
  }
  setSelection(next) {
    if (!this.selectedKeys) this.internalSelection = next;
    this.emit("selectionChange", { keys: [...next] });
    this.requestUpdate();
  }
  toggleRow(key) {
    const next = new Set(this.selection);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.setSelection(next);
  }
  toggleAll(visible) {
    const keys = visible.map((r6) => this.keyOf(r6));
    const allOn = keys.length > 0 && keys.every((k2) => this.selection.has(k2));
    const next = new Set(this.selection);
    if (allOn) keys.forEach((k2) => next.delete(k2));
    else keys.forEach((k2) => next.add(k2));
    this.setSelection(next);
  }
  // ── CSV ─────────────────────────────────────────────────────────────────────────────────────
  csvEscape(v3) {
    const s5 = v3 === null || v3 === void 0 ? "" : String(v3);
    return /[",\n\r]/.test(s5) ? `"${s5.replace(/"/g, '""')}"` : s5;
  }
  /** Exporta las filas a CSV (cabeceras = column.key). Si no hay filas, exporta solo la estructura. */
  exportCsv() {
    const cols = this.columns;
    const head = cols.map((c5) => this.csvEscape(c5.key)).join(",");
    const lines = this.rows.map((r6) => cols.map((c5) => this.csvEscape(r6[c5.key])).join(","));
    const csv = [head, ...lines].join("\r\n");
    const blob = new Blob([CSV_BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a3 = document.createElement("a");
    a3.href = url;
    a3.download = this.csvName;
    a3.click();
    URL.revokeObjectURL(url);
    this.emit("csvExport", { rows: this.rows.length });
    this.emit("export", { rows: this.rows.length });
  }
  parseCsv(text) {
    const out = [];
    let row = [];
    let field = "";
    let q = false;
    for (let i7 = 0; i7 < text.length; i7++) {
      const c5 = text[i7];
      if (q) {
        if (c5 === '"') {
          if (text[i7 + 1] === '"') {
            field += '"';
            i7++;
          } else q = false;
        } else field += c5;
      } else if (c5 === '"') q = true;
      else if (c5 === ",") {
        row.push(field);
        field = "";
      } else if (c5 === "\n" || c5 === "\r") {
        if (c5 === "\r" && text[i7 + 1] === "\n") i7++;
        row.push(field);
        field = "";
        if (row.length > 1 || row[0] !== "") out.push(row);
        row = [];
      } else field += c5;
    }
    if (field !== "" || row.length) {
      row.push(field);
      out.push(row);
    }
    const headers = out.shift() ?? [];
    const rows = out.map((r6) => Object.fromEntries(headers.map((h4, i7) => [h4, r6[i7] ?? ""])));
    return { headers, rows };
  }
  async onImportFile(ev) {
    const input = ev.target;
    const file = input.files?.[0];
    if (!file) return;
    const text = decodeCsvBuffer(await file.arrayBuffer());
    const { headers, rows } = this.parseCsv(text);
    this.emit("csvImport", { headers, rows });
    this.emit("import", { headers, rows });
    input.value = "";
  }
  toggle(p4) {
    if (p4 === "filters" && this.panel !== "filters") {
      this.filterDraft = this.cloneFilters(this.clientFilters);
    }
    this.panel = this.panel === p4 ? "none" : p4;
  }
  // ── Filtros en memoria (modo cliente): borrador → aplicar. ───────────────────────────────────
  cloneFilters(src) {
    const out = {};
    for (const [k2, f3] of Object.entries(src)) {
      out[k2] = { values: f3.values ? new Set(f3.values) : void 0, from: f3.from, to: f3.to };
    }
    return out;
  }
  // Fija el conjunto de valores seleccionados de una columna (multi-select del drawer = ion-select).
  setFilterValues(key, values) {
    const next = this.cloneFilters(this.filterDraft);
    const clean = (values ?? []).filter((v3) => v3 != null && v3 !== "");
    if (clean.length) next[key] = { ...next[key], values: new Set(clean) };
    else next[key] = { ...next[key], values: void 0 };
    this.filterDraft = next;
  }
  setFilterRange(key, edge, value) {
    const next = this.cloneFilters(this.filterDraft);
    next[key] = { ...next[key], [edge]: value };
    this.filterDraft = next;
  }
  applyFilters() {
    const clean = {};
    for (const [k2, f3] of Object.entries(this.filterDraft)) {
      if (f3.values && f3.values.size > 0 || f3.from || f3.to) clean[k2] = f3;
    }
    this.clientFilters = clean;
    this.clientPage = 0;
    this.mobileShown = 0;
    this.panel = "none";
    this.emit("filterChange", { filters: this.serializeFilters(clean) });
  }
  clearFilters() {
    this.filterDraft = {};
  }
  serializeFilters(src) {
    const out = {};
    for (const [k2, f3] of Object.entries(src)) {
      if (f3.values && f3.values.size > 0) out[k2] = [...f3.values];
      else if (f3.from || f3.to) out[k2] = { from: f3.from ?? "", to: f3.to ?? "" };
    }
    return out;
  }
  /** Abre el panel lateral (API pública para el módulo, p.ej. "editar" abre el form pre-rellenado). */
  open(panel = "create") {
    this.panel = panel;
  }
  /** Cierra el panel lateral. */
  close() {
    this.panel = "none";
  }
  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
  get hasSearch() {
    return this.searchable || this.searchKeys.length > 0;
  }
  /** Columnas filtrables (con control en el panel de filtros). En cliente y en servidor. */
  get filterColumns() {
    return this.columns.filter((c5) => c5.filterable);
  }
  /** ¿Hay que mostrar el botón de Filtros? (cualquier columna filtrable). */
  get hasFilterRow() {
    return this.filterColumns.length > 0;
  }
  /** Nº de filtros activos → badge del botón Filtros. En servidor cuenta `filterValues` (#106): sin
   *  esto el embudo no daba NINGUNA señal de que la lista venía acotada. */
  get activeFilterCount() {
    if (this.serverSide) {
      return Object.keys(this.serverFilters).filter((k2) => this.serverFilterState(k2) !== void 0).length;
    }
    return Object.values(this.clientFilters).filter(
      (f3) => f3.values && f3.values.size > 0 || f3.from || f3.to
    ).length;
  }
  // ── Estado de filtro VISIBLE (#106) ──────────────────────────────────────────────────────────
  /** Traduce un valor de `filterValues` (la forma que emite `filterChange`) a la forma interna que
   *  usan los `render*Filter`. `undefined` = ese filtro no está puesto. */
  serverFilterState(key) {
    const raw2 = this.serverFilters[key];
    if (raw2 === void 0 || raw2 === null || raw2 === "") return void 0;
    if (Array.isArray(raw2)) {
      const values = raw2.filter((v3) => v3 !== null && v3 !== void 0 && v3 !== "").map((v3) => String(v3));
      return values.length ? { values: new Set(values) } : void 0;
    }
    if (typeof raw2 === "object") {
      const range = raw2;
      const from = range.from === null || range.from === void 0 || range.from === "" ? void 0 : String(range.from);
      const to = range.to === null || range.to === void 0 || range.to === "" ? void 0 : String(range.to);
      return from !== void 0 || to !== void 0 ? { from, to } : void 0;
    }
    return { values: /* @__PURE__ */ new Set([String(raw2)]) };
  }
  /** Estado de filtro efectivo de una columna: servidor → `filterValues`/espejo; cliente → memoria. */
  filterStateOf(key) {
    return this.serverSide ? this.serverFilterState(key) : this.clientFilters[key];
  }
  /** Fija (o borra) el valor visible de un filtro en el espejo de servidor. */
  setServerFilter(key, value) {
    const next = { ...this.serverFilters };
    const empty = value === void 0 || value === null || value === "" || Array.isArray(value) && value.length === 0;
    if (empty) delete next[key];
    else next[key] = value;
    this.serverFilters = next;
  }
  /** Fija UN extremo de un rango en el espejo. Los dos extremos viajan en eventos SEPARADOS
   *  (`{from}` y luego `{to}`), así que aquí se MEZCLA: reemplazar borraría el otro extremo. */
  setServerRangeEdge(key, edge, value) {
    const prev = this.serverFilters[key];
    const base = prev && typeof prev === "object" && !Array.isArray(prev) ? { ...prev } : {};
    base[edge] = value;
    const alive = (v3) => v3 !== void 0 && v3 !== null && v3 !== "";
    this.setServerFilter(key, alive(base.from) || alive(base.to) ? base : void 0);
  }
  /** Valor crudo de una columna para ordenar/filtrar (usa format si lo hay, si no row[key]). */
  rawValue(col, row) {
    if (col.format) return col.format(row);
    return row[col.key];
  }
  /** Valores distintos de una columna (para los chips del filtro multi-select). */
  distinctValues(col) {
    const set = /* @__PURE__ */ new Set();
    for (const row of this.rows) {
      const v3 = this.rawValue(col, row);
      if (v3 != null && v3 !== "") set.add(String(v3));
    }
    return [...set].sort((a3, b3) => a3.localeCompare(b3));
  }
  /** Filas tras buscar + filtrar + ordenar EN MEMORIA (solo modo cliente). */
  get clientFiltered() {
    let result = this.rows;
    const needle = this.q.trim().toLowerCase();
    if (needle && this.searchKeys.length) {
      result = result.filter(
        (r6) => this.searchKeys.some((k2) => String(r6[k2] ?? "").toLowerCase().includes(needle))
      );
    }
    const fkeys = Object.keys(this.clientFilters);
    if (fkeys.length) {
      result = result.filter(
        (row) => fkeys.every((key) => {
          const f3 = this.clientFilters[key];
          const col = this.columns.find((c5) => c5.key === key);
          if (!col) return true;
          if (f3.values && f3.values.size > 0) {
            return f3.values.has(String(this.rawValue(col, row) ?? ""));
          }
          if (f3.from || f3.to) {
            const raw2 = this.rawValue(col, row);
            const t5 = raw2 == null ? NaN : new Date(raw2).getTime();
            const from = f3.from ? new Date(f3.from).getTime() : -Infinity;
            const to = f3.to ? new Date(f3.to).getTime() + 864e5 - 1 : Infinity;
            return !Number.isNaN(t5) && t5 >= from && t5 <= to;
          }
          return true;
        })
      );
    }
    if (this.clientSort) {
      const col = this.columns.find((c5) => c5.key === this.clientSort);
      if (col) {
        const dir = this.clientSortDir === "asc" ? 1 : -1;
        result = [...result].sort((a3, b3) => {
          const va = this.rawValue(col, a3);
          const vb = this.rawValue(col, b3);
          if (va == null) return 1;
          if (vb == null) return -1;
          if (va < vb) return -1 * dir;
          if (va > vb) return 1 * dir;
          return 0;
        });
      }
    }
    return result;
  }
  cell(col, row) {
    if (col.format) return col.format(row);
    const v3 = row[col.key];
    return v3 === null || v3 === void 0 ? "" : String(v3);
  }
  /** ¿Es ordenable la columna? Servidor: opt-in (`sortable`). Cliente: por defecto SÍ (como el Hub),
   *  salvo `sortable: false` explícito. */
  isSortable(col) {
    return this.serverSide ? !!col.sortable : col.sortable !== false;
  }
  onHeaderClick(col) {
    if (!this.isSortable(col)) return;
    if (this.serverSide) {
      const dir = this.sort === col.key && this.sortDir === "asc" ? "desc" : "asc";
      this.emit("sortChange", { sort: col.key, dir });
      return;
    }
    this.mobileShown = 0;
    if (this.clientSort === col.key) {
      this.clientSortDir = this.clientSortDir === "asc" ? "desc" : "asc";
    } else {
      this.clientSort = col.key;
      this.clientSortDir = "asc";
    }
  }
  onFilterInput(col, ev) {
    const value = ev.target.value ?? "";
    this.setServerFilter(col.key, value);
    this.emit("filterChange", { col: col.key, value });
  }
  onRangeInput(col, edge, ev) {
    const raw2 = ev.target.value ?? "";
    const v3 = raw2 === "" ? "" : Number(raw2);
    this.setServerRangeEdge(col.key, edge, v3);
    this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
  }
  onDateRangeInput(col, edge, ev) {
    const v3 = ev.target.value ?? "";
    this.setServerRangeEdge(col.key, edge, v3);
    this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
  }
  // ── Filtros EN LÍNEA (toolbar) ────────────────────────────────────────────────────────────
  // En modo cliente escriben directamente `clientFilters` (filtran en memoria); en servidor solo
  // emiten `filterChange`. Reutilizan la misma forma de filtro que el drawer (values / from / to).
  setClientFilter(key, patch) {
    const next = { ...this.clientFilters };
    const merged = { ...next[key], ...patch };
    const empty = (!merged.values || merged.values.size === 0) && !merged.from && !merged.to;
    if (empty) delete next[key];
    else next[key] = merged;
    this.clientFilters = next;
    this.clientPage = 0;
    this.mobileShown = 0;
  }
  // ion-select (select/multiselect) del panel de filtros (renderFilterControl). En servidor emite
  // `filterChange`; en cliente escribe `clientFilters` (multiselect ⇒ filtra por inclusión).
  onFilterSelect(col, value, multi) {
    if (this.serverSide) {
      const next = value ?? (multi ? [] : "");
      this.setServerFilter(col.key, next);
      this.emit("filterChange", { col: col.key, value: next });
      return;
    }
    if (multi) {
      const arr = Array.isArray(value) ? value.map((v3) => String(v3)) : value != null && value !== "" ? [String(value)] : [];
      this.setClientFilter(col.key, { values: arr.length ? new Set(arr) : void 0 });
    } else {
      const v3 = String(value ?? "");
      this.setClientFilter(col.key, { values: v3 ? /* @__PURE__ */ new Set([v3]) : void 0 });
    }
  }
  onInlineRange(col, edge, ev) {
    const v3 = ev.target.value ?? "";
    if (this.serverSide) {
      this.setServerRangeEdge(col.key, edge, v3);
      this.emit("filterChange", { col: col.key, value: { [edge]: v3 } });
      return;
    }
    this.setClientFilter(col.key, { [edge]: v3 || void 0 });
  }
  // Menú overflow: ancla el popover al botón vía el evento de click (compatible con Shadow DOM).
  openMenu(ev) {
    this.menuEv = ev;
    this.menuOpen = true;
  }
  /** #122 — Abre el menú «⋮» de UNA fila. Un solo popover para toda la tabla (uno por fila serían
   *  tantos como filas), anclado por evento porque `trigger` no resuelve dentro de Shadow DOM. */
  openRowMenu(ev, row) {
    ev.stopPropagation();
    this.rowMenuEv = ev;
    this.rowMenuRow = row;
    this.rowMenuOpen = true;
  }
  /** #122 — Las mismas acciones de la fila, como lista. Respeta `disabled`/`loading` por fila: una
   *  acción que no se puede pulsar en su botón tampoco se puede pulsar aquí. */
  renderRowMenu() {
    const row = this.rowMenuRow;
    if (!this.actions.length || !row) return A;
    const key = this.keyOf(row);
    return b2`
      <ion-popover
        class="row-menu"
        .isOpen=${this.rowMenuOpen}
        .event=${this.rowMenuEv}
        dismiss-on-select="true"
        @didDismiss=${() => this.rowMenuOpen = false}
      >
        <ion-content>
          <ion-list lines="none">
            ${this.actions.map((a3) => {
      const disabled = a3.loading?.(row) === true || a3.disabled?.(row) === true;
      const label = typeof a3.label === "function" ? a3.label(row) : a3.label;
      return b2`
                <!-- #143 — The action is named the SAME collapsed or not, so one spec works at any
                     width. It carries the hook only while the direct buttons are NOT there: the
                     popover survives its dismissal («rowMenuRow» is not cleared), and if the table
                     widened again there would be TWO elements with the hook and «getByTestId»
                     would pick one at random. -->
                <ion-item
                  button
                  data-testid=${this.rowActionsCollapsed ? this.tid(`row-${key}-${a3.id}`) : A}
                  ?disabled=${disabled}
                  aria-disabled=${disabled ? "true" : A}
                  .detail=${false}
                  @click=${() => {
        if (disabled) return;
        this.rowMenuOpen = false;
        this.emit("rowAction", { actionId: a3.id, row });
      }}
                >
                  ${a3.icon ? b2`<ion-icon slot="start" .icon=${okIcon(a3.icon)} color=${a3.color ?? A}></ion-icon>` : A}
                  <ion-label color=${a3.color ?? A}>${label}</ion-label>
                </ion-item>
              `;
    })}
          </ion-list>
        </ion-content>
      </ion-popover>
    `;
  }
  // Aplica la vista inicial declarada (`default-view`) una sola vez, tras el primer render. Es la
  // forma robusta de arrancar en tarjetas sin depender de fijar `viewMode` por referencia (que
  // falla si la tabla monta detrás de un `v-if`/loading y el ref aún es null).
  firstUpdated() {
    this.applyInitialView();
  }
  /** Re-evalúa la vista inicial cada render mientras el usuario no haya elegido a mano.
   *
   * `firstUpdated` NO basta: decide una sola vez, y los consumidores que asignan las props por JS
   * DESPUÉS de insertar el elemento —lo normal en páginas renderizadas por el servidor— llegan
   * tarde. En ese momento `cardViewEnabled` aún era `false`, así que no se conmutaba; y el
   * listener de `matchMedia` solo dispara al CAMBIAR el viewport, cosa que en un móvil no pasa
   * nunca. La tabla se quedaba con scroll lateral para siempre.
   *
   * Medido en Android contra producción el 2026-08-02 con el bundle ya actualizado:
   *   `views` antes de insertar  → tarjetas
   *   `views` después de insertar → tabla   ← lo que hace la página
   */
  willUpdate(changed) {
    this.applyInitialView();
    if (changed.has("filterValues")) this.serverFilters = { ...this.filterValues ?? {} };
    if (changed.has("search") && this.search !== void 0) {
      this.q = this.search;
      if (!this.serverSide) {
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    }
    if (!this.serverSide && changed.has("rows") && this.mobileShown !== 0) this.mobileShown = 0;
  }
  applyInitialView() {
    if (this.viewChosenByUser) return;
    if (this.isMobile && this.cardViewEnabled) {
      this.viewMode = "cards";
    } else if (this.defaultView === "cards" && this.cardViewEnabled) {
      this.viewMode = "cards";
    } else if (this.defaultView === "table") {
      this.viewMode = "table";
    }
  }
  setViewMode(mode) {
    this.viewChosenByUser = true;
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.emit("viewChange", mode);
  }
  // Control de filtro de una columna, con componentes Ionic (mismos inputs que el form de alta).
  renderFilterControl(col) {
    if (!col.filterable) return A;
    const type = col.filterType ?? "text";
    const f3 = this.filterStateOf(col.key);
    if (type === "select" || type === "multiselect") {
      const multi = type === "multiselect";
      const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
      const current = this.selectValue(f3, multi);
      return b2`
        <ion-select
          label=${col.header}
          label-placement="stacked"
          fill="outline" mode="md"
          ?multiple=${multi}
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          placeholder=${this.t.select}
          .value=${current}
          @ionChange=${(e6) => this.onFilterSelect(col, e6.detail.value, multi)}
        >
          ${multi ? A : b2`<ion-select-option value="">${this.t.select}</ion-select-option>`}
          ${opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      `;
    }
    if (type === "range" || type === "daterange") {
      const t5 = type === "daterange" ? "date" : "number";
      const onEdge = type === "daterange" ? this.onDateRangeInput.bind(this) : this.onRangeInput.bind(this);
      return b2`
        <div class="fblock">
          <span class="flabel">${col.header}</span>
          <div class="frange">
            <ion-input type=${t5} fill="outline" mode="md" placeholder=${type === "daterange" ? this.t.from : this.t.gte}
              .value=${f3?.from ?? ""}
              @ionInput=${(e6) => onEdge(col, "from", e6)}></ion-input>
            <ion-input type=${t5} fill="outline" mode="md" placeholder=${type === "daterange" ? this.t.to : this.t.lte}
              .value=${f3?.to ?? ""}
              @ionInput=${(e6) => onEdge(col, "to", e6)}></ion-input>
          </div>
        </div>
      `;
    }
    const inputType = type === "number" ? "number" : type === "date" ? "date" : "text";
    return b2`
      <ion-input
        type=${inputType}
        fill="outline" mode="md"
        label=${col.header}
        label-placement="stacked"
        placeholder=${this.t.filterPlaceholder}
        .value=${this.selectValue(f3, false)}
        @ionInput=${(e6) => this.onFilterInput(col, e6)}
      ></ion-input>
    `;
  }
  /** Valor para un control de un solo valor (`ion-select`/`ion-input`) o multi (`ion-select
   *  multiple`) a partir del estado de filtro interno. '' / [] = sin filtro. */
  selectValue(f3, multi) {
    const values = [...f3?.values ?? /* @__PURE__ */ new Set()];
    if (multi) return values;
    return values.length ? values[0] : "";
  }
  // Controles de filtro COMPACTOS para la toolbar (modo `inlineFilters`). Solo select y rango de
  // fechas (los del screenshot); el resto de tipos siguen disponibles vía el drawer si no se activa
  // `inlineFilters`. Look: «Todos los Estados» (placeholder) / «01/10/25 → 18/10/25».
  renderInlineFilters() {
    const cols = this.filterColumns.filter((c5) => {
      const t5 = c5.filterType ?? "text";
      return t5 === "select" || t5 === "multiselect" || t5 === "date" || t5 === "daterange";
    });
    if (!cols.length) return A;
    return b2`${cols.map((c5) => this.renderInlineFilter(c5))}`;
  }
  renderInlineFilter(col) {
    const type = col.filterType ?? "text";
    const f3 = this.filterStateOf(col.key);
    if (type === "select" || type === "multiselect") {
      const multi = type === "multiselect";
      const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
      const current = this.selectValue(f3, multi);
      return b2`
        <ion-select
          class="tk-filter"
          ?multiple=${multi}
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          aria-label=${col.header}
          placeholder=${col.header}
          .value=${current}
          @ionChange=${(e6) => this.onFilterSelect(col, e6.detail.value, multi)}
        >
          ${multi ? A : b2`<ion-select-option value="">${col.header}</ion-select-option>`}
          ${opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      `;
    }
    return b2`
      <span class="tk-daterange" role="group" aria-label=${col.header}>
        <ion-icon .icon=${iconCalendarOutline}></ion-icon>
        <ion-input type="date" aria-label=${this.t.fromOf.replace("{label}", col.header)} .value=${f3?.from ?? ""} @ionChange=${(e6) => this.onInlineRange(col, "from", e6)}></ion-input>
        <span class="arr">→</span>
        <ion-input type="date" aria-label=${this.t.toOf.replace("{label}", col.header)} .value=${f3?.to ?? ""} @ionChange=${(e6) => this.onInlineRange(col, "to", e6)}></ion-input>
      </span>
    `;
  }
  // Menú overflow («⋮») con ion-popover anclado por evento (Shadow-DOM-safe).
  renderOverflowMenu() {
    if (!this.menuActions.length) return A;
    return b2`
      <ion-button class="toolbtn" fill="clear" aria-label=${this.t.moreActions} @click=${(e6) => this.openMenu(e6)}>
        <ion-icon slot="icon-only" .icon=${iconEllipsisVertical}></ion-icon>
      </ion-button>
      <ion-popover
        .isOpen=${this.menuOpen}
        .event=${this.menuEv}
        dismiss-on-select="true"
        @didDismiss=${() => this.menuOpen = false}
      >
        <ion-content>
          <ion-list lines="none">
            ${this.menuActions.map(
      (a3) => b2`
                <ion-item button .detail=${false} @click=${() => {
        this.menuOpen = false;
        this.emit("menuAction", { actionId: a3.id });
      }}>
                  ${a3.icon ? b2`<ion-icon slot="start" .icon=${okIcon(a3.icon)} color=${a3.color ?? A}></ion-icon>` : A}
                  <ion-label color=${a3.color ?? A}>${a3.label}</ion-label>
                </ion-item>
              `
    )}
          </ion-list>
        </ion-content>
      </ion-popover>
    `;
  }
  // Row action buttons, shared by the table and the card views.
  //
  // `collapsible` = the LIST view, the only one that folds its buttons into a "⋮" menu when the
  // columns leave it no width (#122). The CARD view does not fold; it WRAPS instead, see
  // `.ractions .actions` in the stylesheet.
  //
  // This comment used to claim that a card's actions "always fit across the card". They do not,
  // and nobody had measured it (#132 / ERPlora/appointments#154): with the eight actions an
  // appointment carries, the row asks for 380px and the card gives 379px at 411dp, 237px at 768px
  // and 272px at 1440px — so the first button hung off the card at ALL THREE widths, not just on
  // a phone. If you add a view that lays these buttons out, MEASURE it.
  actionButtons(row, collapsible = false) {
    if (!this.actions.length) return A;
    const key = this.keyOf(row);
    if (collapsible && this.rowActionsCollapsed) {
      return b2`
        <div class="actions">
          <ion-button
            size="small"
            fill="clear"
            color="medium"
            data-testid=${this.tid(`row-${key}-menu`)}
            aria-label=${this.t.moreActions}
            title=${this.t.moreActions}
            aria-haspopup="menu"
            @click=${(e6) => this.openRowMenu(e6, row)}
          >
            <ion-icon slot="icon-only" .icon=${okIcon(iconEllipsisVertical)}></ion-icon>
          </ion-button>
        </div>
      `;
    }
    return b2`
      <div class="actions">
        ${this.actions.map(
      (a3) => {
        const loading = a3.loading?.(row) === true;
        const disabled = loading || a3.disabled?.(row) === true;
        const label = typeof a3.label === "function" ? a3.label(row) : a3.label;
        return b2`
            <ion-button
              size="small"
              fill="clear"
              color=${a3.color ?? "medium"}
              data-testid=${this.tid(`row-${key}-${a3.id}`)}
              ?disabled=${disabled}
              aria-disabled=${disabled ? "true" : A}
              aria-label=${label}
              title=${label}
              @click=${() => this.emit("rowAction", { actionId: a3.id, row })}
            >
              ${loading ? b2`<ion-spinner slot="icon-only" name="dots"></ion-spinner>` : a3.icon ? b2`<ion-icon slot="icon-only" .icon=${okIcon(a3.icon)}></ion-icon>` : label}
            </ion-button>
          `;
      }
    )}
      </div>
    `;
  }
  // Botón de barra icon-only (filtros / alta / conmutador de vista). `on` = estado activo.
  // `badge` opcional → contador (p.ej. nº de filtros activos), look del Hub.
  toolButton(icon, on, onClick, label, badge, testid = A) {
    return b2`
      <ion-button class="toolbtn" size="small" fill=${on ? "solid" : "outline"} data-testid=${testid} title=${label} aria-label=${label} @click=${onClick}>
        <ion-icon slot="icon-only" .icon=${okIcon(icon)}></ion-icon>
        ${badge && badge > 0 ? b2`<span class="badge">${badge}</span>` : A}
      </ion-button>
    `;
  }
  /** Plantilla de columnas del grid de la vista lista: [checkbox] [columnas…] [acciones]. */
  gridTemplate() {
    return [
      this.selectable ? "2.75rem" : null,
      // #120 - 5.5rem (88px) is the narrowest a data column can be and stay readable: ~11
      // characters at 14px, plus the ellipsis `.gcell > span` already applies. With the previous
      // floor (8rem = 128px) the six columns of a bookings list did not fit the counter tablet
      // (128x6 + 188 for actions + gaps = 1036px against 834) and the pinned column ended up on
      // top of the data. With 5.5rem they fit (796px) and `1fr` stretches them to 94px each.
      ...this.visibleColumns.map((c5) => c5.width ?? "minmax(5.5rem,1fr)"),
      // #121 - a LENGTH, not `max-content`. The header and every row are separate grids that
      // share this string, and a content-sized track is not a length: each grid resolves it
      // against ITS OWN content - the word "ACCIONES" (62.83px) in the header, four buttons
      // (188px) in the row. The leftover the `1fr` columns share then differed between the two,
      // and the header slid right, up to 125px by the last column (measured at 834px).
      // `actionsTrackPx` is the width of the buttons MEASURED on screen, so it also keeps #120's
      // contract: the track never shrinks under its content (an `auto` track collapsed to 16px
      // and the buttons spilled over the neighbouring column). Until the first measurement lands
      // - one frame - `max-content` reserves the same room it always did.
      this.actions.length ? this.actionsTrackPx > 0 ? `${this.actionsTrackPx}px` : "max-content" : null
    ].filter(Boolean).join(" ");
  }
  /** Lista de páginas a mostrar en el pager numerado (1-based): primera, última, vecinas de la
   *  actual y «…» donde haya saltos. P.ej. en página 1 de 52 → [1,2,3,'…',52]. */
  pageList(cur1, total) {
    if (total <= 7) return Array.from({ length: total }, (_2, i7) => i7 + 1);
    const want = /* @__PURE__ */ new Set([1, total, cur1, cur1 - 1, cur1 + 1]);
    if (cur1 <= 3) [2, 3].forEach((p4) => want.add(p4));
    if (cur1 >= total - 2) [total - 1, total - 2].forEach((p4) => want.add(p4));
    const sorted = [...want].filter((p4) => p4 >= 1 && p4 <= total).sort((a3, b3) => a3 - b3);
    const out = [];
    let prev = 0;
    for (const p4 of sorted) {
      if (p4 - prev > 1) out.push("\u2026");
      out.push(p4);
      prev = p4;
    }
    return out;
  }
  render() {
    const ps = this.serverSide ? this.pageSize : this.clientPageSize || this.pageSize;
    let visible;
    let pages;
    let current;
    let count;
    if (this.serverSide) {
      visible = this.rows;
      count = this.total;
      pages = Math.max(1, Math.ceil(this.total / ps));
      current = Math.min(this.page, pages - 1);
    } else {
      const filtered = this.clientFiltered;
      count = filtered.length;
      pages = Math.max(1, Math.ceil(filtered.length / ps));
      current = Math.min(this.clientPage, pages - 1);
      visible = this.isMobile ? filtered.slice(0, Math.min(this.mobileShown || ps, count)) : filtered.slice(current * ps, current * ps + ps);
    }
    const served = this.serverSide ? (current + 1) * ps : Math.min(this.mobileShown || ps, count);
    const canLoadMore = this.isMobile && served < count;
    const loadMore = () => {
      if (this.serverSide) this.emit("pageChange", current + 1);
      else this.mobileShown = Math.min((this.mobileShown || ps) + ps, count);
    };
    const goTo = (p4) => {
      if (this.serverSide) this.emit("pageChange", p4);
      else this.clientPage = p4;
    };
    const setPageSize = (n6) => {
      if (this.serverSide) this.emit("pageSizeChange", n6);
      else {
        this.clientPageSize = n6;
        this.clientPage = 0;
        this.mobileShown = 0;
      }
    };
    const searchbar = b2`<ion-searchbar class="ion-no-border" data-testid=${this.tid("search")} .value=${this.q} placeholder=${this.effSearchPlaceholder} debounce="250" @ionInput=${this.onSearch}></ion-searchbar>`;
    const selCount = this.selection.size;
    const showTopbar = !!this.title || this.hasSearch || this.viewToggle || this.effColumnPicker || this.effExport || this.effImport || this.hasFilterRow || this.addable || !!this.primaryAction;
    return b2`
      <div class=${`card${this.panel !== "none" ? " has-panel" : ""}`}>
        ${showTopbar ? b2`
              <div class="bar">
                <div class="bar-main">
                  ${this.title ? b2`<div class="title-wrap"><h2 class="title">${this.title}</h2><span class="title-count">${count}</span></div>` : A}
                  ${this.hasSearch ? b2`<div class="search">${searchbar}</div>` : A}
                  ${this.inlineFilters ? this.renderInlineFilters() : A}
                  <span class="tk-spacer"></span>
                    ${this.effColumnPicker && !this.isMobile ? b2`
                          <ion-select
                            class="tk-cols"
                            multiple
                            interface="popover"
                            aria-label=${this.t.columnsVisible}
                            .value=${this.visibleColumns.map((c5) => c5.key)}
                            .selectedText=${this.t.columns}
                            @ionChange=${(e6) => this.setVisibleColumns(e6.detail.value)}
                          >
                            ${this.columns.map((c5) => b2`<ion-select-option value=${c5.key}>${c5.header}</ion-select-option>`)}
                          </ion-select>
                        ` : A}
                    ${this.effPageSizes.length && !this.isMobile ? b2`
                          <ion-select
                            class="tk-psize"
                            interface="popover"
                            aria-label=${this.t.rowsPerPage}
                            .value=${ps}
                            @ionChange=${(e6) => setPageSize(Number(e6.detail.value))}
                          >
                            ${this.effPageSizes.map((n6) => b2`<ion-select-option .value=${n6}>${n6}</ion-select-option>`)}
                          </ion-select>
                        ` : A}
                    ${this.viewToggle ? b2`
                          <span class="viewseg">
                            ${this.toolButton("list-outline", this.viewMode === "table", () => this.setViewMode("table"), this.t.viewList)}
                            ${this.toolButton("grid-outline", this.viewMode === "cards", () => this.setViewMode("cards"), this.t.viewCards)}
                          </span>
                        ` : A}
                    ${this.hasFilterRow && !this.inlineFilters ? this.toolButton("funnel-outline", this.panel === "filters" || this.activeFilterCount > 0, () => this.toggle("filters"), this.t.filters, this.activeFilterCount) : A}
                    ${this.effImport ? b2`
                          ${this.toolButton("cloud-upload-outline", false, () => this.renderRoot.querySelector(".tk-file")?.click(), this.t.importCsv)}
                          <!-- #143 — The import hook goes on the INPUT, not on the button that
                               triggers it: what a spec drives is «setInputFiles», and nobody opens
                               the button's native dialog from a test. Same criterion as
                               «GrantFilePicker.vue» in the Hub (the hook goes on the control, not
                               on its disguise). -->
                          <input class="tk-file" data-testid=${this.tid("csv-import")} type="file" accept=".csv,text/csv" hidden @change=${(e6) => this.onImportFile(e6)} />
                        ` : A}
                    ${this.effExport ? this.toolButton("download-outline", false, () => this.exportCsv(), this.t.exportCsv, void 0, this.tid("csv-export")) : A}
                    <!-- #113 — Mismo botón en los dos viewports: la acción principal de la pantalla
                         se lee, no se adivina. En escritorio era un «+» de 36px idéntico a los
                         iconos de vista/filtrar/exportar, y era el último de cuatro. -->
                    ${this.addable ? b2`
                          <ion-button class="primary-btn add-btn" data-testid=${this.tid("add")} size="small" @click=${() => this.toggle("create")}>
                            <ion-icon slot="start" .icon=${okIcon("add")}></ion-icon>${this.t.add}
                          </ion-button>
                        ` : A}
                    ${this.renderOverflowMenu()}
                    ${this.primaryAction ? b2`
                          <!-- #143 — Its own hook and NOT «-add»: «addable» and «primaryAction» are
                               two different buttons that may coexist, and both are really used
                               («addable» in the modules, «primaryAction» in the SaaS screens).
                               Sharing the name would give two elements with the same hook as soon
                               as a screen declared both. -->
                          <ion-button class="primary-btn add-btn" data-testid=${this.tid("primary-action")} size="small" @click=${() => this.emit("primaryAction", {})}>
                            <ion-icon slot="start" .icon=${okIcon(this.primaryAction.icon ?? "add")}></ion-icon>${this.primaryAction.label}
                          </ion-button>
                        ` : A}
                    <!-- El módulo proyecta aquí acciones globales adicionales. -->
                    <slot name="toolbar"></slot>
                </div>
                ${this.selectable && selCount > 0 ? b2`
                      <div class="selbar">
                        <strong>${this.t.selected.replace("{n}", String(selCount))}</strong>
                        <button class="sel-clear" @click=${() => this.setSelection(/* @__PURE__ */ new Set())}>
                          <ion-icon .icon=${iconClose} style="font-size:14px"></ion-icon> ${this.t.clear}
                        </button>
                      </div>
                    ` : A}
              </div>
            ` : A}

        ${this.viewMode === "cards" && this.cardViewEnabled ? this.renderCards(visible) : this.renderTable(visible)}

        ${pages > 1 || this.effPageSizes.length ? b2`
              <div class="pager">
                <div class="left">
                  <span>
                    ${pages > 1 ? b2`${this.t.showing.replace("{from}", String(this.isMobile && !this.serverSide ? 1 : current * ps + 1)).replace("{to}", String(Math.min(served, count)))} ` : A}
                    <span class="strong">${count}</span> ${count === 1 ? this.t.recordSingular : this.t.recordPlural}
                  </span>
                  ${!showTopbar && this.effPageSizes.length ? b2`
                        <select class="psize" @change=${(e6) => setPageSize(Number(e6.target.value))}>
                          ${this.effPageSizes.map((n6) => b2`<option value=${n6} ?selected=${n6 === ps}>${this.t.perPageShort.replace("{n}", String(n6))}</option>`)}
                        </select>
                      ` : A}
                </div>
                ${this.isMobile ? canLoadMore ? b2`<ion-button class="load-more" data-testid=${this.tid("load-more")} size="small" @click=${loadMore}>${this.t.loadMore}</ion-button>` : A : pages > 1 ? b2`
                      <div class="nav">
                        <ion-button size="small" fill="clear" data-testid=${this.tid("page-prev")} ?disabled=${current === 0} @click=${() => goTo(current - 1)}><ion-icon slot="icon-only" .icon=${iconChevronBack}></ion-icon></ion-button>
                        ${this.pageList(current + 1, pages).map(
      (p4) => p4 === "\u2026" ? b2`<span class="pgap">…</span>` : b2`<button class=${`pnum${p4 === current + 1 ? " on" : ""}`} @click=${() => goTo(p4 - 1)}>${p4}</button>`
    )}
                        <ion-button size="small" fill="clear" data-testid=${this.tid("page-next")} ?disabled=${current >= pages - 1} @click=${() => goTo(current + 1)}><ion-icon slot="icon-only" .icon=${iconChevronForward}></ion-icon></ion-button>
                      </div>
                    ` : A}
              </div>
            ` : A}

        ${this.panel !== "none" ? this.renderDrawer() : A}
      </div>
    `;
  }
  // Panel lateral derecho DENTRO de la tabla (no empuja contenido; igual en lista y tarjetas).
  renderDrawer() {
    const isFilters = this.panel === "filters";
    const clientFilters = isFilters && !this.serverSide;
    return b2`
      <div class="tk-scrim" @click=${() => this.close()}></div>
      <aside class="drawer" role="dialog" aria-label=${isFilters ? this.t.filters : this.t.form}>
        <header class="dh">
          <strong>${isFilters ? this.t.filters : this.t.newRecord}</strong>
          <ion-button fill="clear" size="small" aria-label=${this.t.close} @click=${() => this.close()}><ion-icon slot="icon-only" .icon=${iconClose}></ion-icon></ion-button>
        </header>
        <div class="db">
          ${isFilters ? clientFilters ? this.filterColumns.map((c5) => this.renderClientFilter(c5)) : this.filterColumns.map((c5) => b2`<div class="fblock">${this.renderFilterControl(c5)}</div>`) : b2`<slot name="create"></slot>`}
        </div>
        ${clientFilters ? b2`
              <footer class="df">
                <button class="sel-clear df-clear" ?disabled=${Object.keys(this.filterDraft).length === 0} @click=${() => this.clearFilters()}>${this.t.clear}</button>
                <ion-button class="primary-btn" size="small" @click=${() => this.applyFilters()}>${this.t.apply}</ion-button>
              </footer>
            ` : A}
      </aside>
    `;
  }
  // Control de filtro CLIENTE de una columna: chips multi-select (select) o rango de fechas.
  renderClientFilter(col) {
    const label = col.header;
    if (col.filterType === "daterange" || col.filterType === "date") {
      const f3 = this.filterDraft[col.key] ?? {};
      return b2`
        <div class="fblock">
          <span class="flabel">${label}</span>
          <div class="daterange">
            <ion-input type="date" label=${this.t.from} label-placement="stacked" fill="outline" mode="md" .value=${f3.from ?? ""} @ionChange=${(e6) => this.setFilterRange(col.key, "from", e6.detail.value ?? "")}></ion-input>
            <ion-input type="date" label=${this.t.to} label-placement="stacked" fill="outline" mode="md" .value=${f3.to ?? ""} @ionChange=${(e6) => this.setFilterRange(col.key, "to", e6.detail.value ?? "")}></ion-input>
          </div>
        </div>
      `;
    }
    const opts = col.options ?? this.distinctValues(col).map((v3) => ({ value: v3, label: v3 }));
    const selected = [...this.filterDraft[col.key]?.values ?? /* @__PURE__ */ new Set()];
    return b2`
      <div class="fblock">
        <ion-select
          label=${label}
          label-placement="stacked"
          fill="outline" mode="md"
          multiple
          interface="modal"
          .interfaceOptions=${{ cssClass: "ok-overlay" }}
          placeholder=${this.t.select}
          .value=${selected}
          @ionChange=${(e6) => this.setFilterValues(col.key, e6.detail.value ?? [])}
        >
          ${opts.length === 0 ? b2`<ion-select-option .disabled=${true} value="">${this.t.noValues}</ion-select-option>` : opts.map((o7) => b2`<ion-select-option value=${o7.value}>${o7.label}</ion-select-option>`)}
        </ion-select>
      </div>
    `;
  }
  /** #67 — Enter/Espacio activan la fila clicable (y, desde #74, la tarjeta): si se llega con el
   *  tabulador, el ratón no puede ser el único camino. Espacio además NO debe desplazar la página. */
  onRowKeydown(e6, row) {
    if (e6.key !== "Enter" && e6.key !== " " && e6.key !== "Spacebar") return;
    e6.preventDefault();
    this.emit("rowClick", { row });
  }
  emptyState() {
    return b2`
      <div class="empty">
        <span class="empty-ic"><ion-icon .icon=${iconFileTrayOutline}></ion-icon></span>
        <span>${this.effEmptyMessage}</span>
      </div>
    `;
  }
  // Vista LISTA en CSS GRID (no <table>): permite ancho por columna y cabecera sticky.
  renderTable(visible) {
    if (visible.length === 0) return this.emptyState();
    const cols = this.visibleColumns;
    const tpl = { gridTemplateColumns: this.gridTemplate() };
    const allOn = this.selectable && visible.length > 0 && visible.every((r6) => this.selection.has(this.keyOf(r6)));
    const alignCls = (a3) => a3 === "right" ? "right" : a3 === "center" ? "center" : "left";
    return b2`
      <div class=${`scroll${this.xOverflow ? " x-overflow" : ""}`}>
        <div class="grid" role="table">
          <!-- Cabecera -->
          <div class="grow ghead" role="row" style=${o6(tpl)}>
            ${this.selectable ? b2`<span class="selcb"><ion-checkbox .checked=${allOn} aria-label=${this.t.selectAll} @ionChange=${() => this.toggleAll(visible)}></ion-checkbox></span>` : A}
            ${cols.map((c5) => {
      const sortable = this.isSortable(c5);
      const active = sortable && (this.serverSide ? this.sort === c5.key : this.clientSort === c5.key);
      const dir = this.serverSide ? this.sortDir : this.clientSortDir;
      const caretIcon = !active ? iconSwapVerticalOutline : dir === "asc" ? iconChevronUpOutline : iconChevronDownOutline;
      return b2`
                <div
                  class=${`gcell gh ${alignCls(c5.align)}${sortable ? " sortable" : ""}${c5.pinned === "end" ? " actions-col" : ""}`}
                  role="columnheader"
                  @click=${() => this.onHeaderClick(c5)}
                >
                  <span>${c5.header}</span>
                  ${sortable ? b2`<span class=${`caret${active ? " on" : ""}`}><ion-icon .icon=${okIcon(caretIcon)}></ion-icon></span>` : A}
                </div>
              `;
    })}
            ${this.actions.length ? b2`<div class="gcell gh right actions-col" role="columnheader">
                  ${this.rowActionsCollapsed ? b2`<span class="sr-only">${this.t.actions}</span>` : b2`<span>${this.t.actions}</span>`}
                </div>` : A}
          </div>

          <!-- Filas -->
          ${c4(
      visible,
      (row) => this.keyOf(row),
      (row) => {
        const key = this.keyOf(row);
        const selected = this.selectable && this.selection.has(key);
        return b2`
                <div
                  class=${`grow grow-data${selected ? " selected" : ""}${this.rowClickable ? " clickable" : ""}`}
                  role="row"
                  data-testid=${this.tid(`row-${key}`)}
                  style=${o6(tpl)}
                  tabindex=${this.rowClickable ? "0" : A}
                  @click=${this.rowClickable ? () => this.emit("rowClick", { row }) : A}
                  @keydown=${this.rowClickable ? (e6) => this.onRowKeydown(e6, row) : A}
                >
                  ${this.selectable ? b2`<span class="selcb" @click=${(e6) => e6.stopPropagation()}><ion-checkbox .checked=${selected} aria-label=${this.t.selectRow} @ionChange=${() => this.toggleRow(key)}></ion-checkbox></span>` : A}
                  ${cols.map(
          (c5) => b2`<div class=${`gcell ${alignCls(c5.align)}${c5.pinned === "end" ? " actions-col" : ""}`} role="cell">${c5.render ? c5.render(row) : b2`<span>${this.cell(c5, row)}</span>`}</div>`
        )}
                  ${this.actions.length ? b2`<div class="gcell right actions-col" role="cell" @click=${(e6) => e6.stopPropagation()}>${this.actionButtons(row, true)}</div>` : A}
                </div>
              `;
      }
    )}
        </div>
      </div>
      ${this.renderRowMenu()}
    `;
  }
  renderCards(visible) {
    if (visible.length === 0) return this.emptyState();
    const hasHead = !!this.cardTitle || !!this.cardIcon || this.selectable;
    return b2`
      <div class="cards-grid">
        ${c4(
      visible,
      (row) => this.keyOf(row),
      (row) => {
        const key = this.keyOf(row);
        const selected = this.selectable && this.selection.has(key);
        const icon = this.cardIcon?.(row);
        return b2`
              <ion-card
                class=${`rcard${selected ? " selected" : ""}${this.rowClickable ? " clickable" : ""}`}
                data-testid=${this.tid(`row-${key}`)}
                role=${this.rowClickable ? "button" : A}
                tabindex=${this.rowClickable ? "0" : A}
                @click=${this.rowClickable ? () => this.emit("rowClick", { row }) : A}
                @keydown=${this.rowClickable ? (e6) => this.onRowKeydown(e6, row) : A}
              >
                ${hasHead ? b2`
                      <ion-card-header class="rcard-head">
                        ${icon != null && icon !== "" ? b2`<span class="rc-icon">${typeof icon === "string" ? b2`<ion-icon .icon=${okIcon(icon)}></ion-icon>` : icon}</span>` : A}
                        <span class="rc-title">${this.cardTitle ? this.cardTitle(row) : A}</span>
                        ${this.selectable ? b2`<ion-checkbox .checked=${selected} aria-label=${this.t.select} @click=${(e6) => e6.stopPropagation()} @ionChange=${() => this.toggleRow(key)}></ion-checkbox>` : A}
                      </ion-card-header>
                    ` : A}
                <ion-card-content class="rcard-body">
                  ${this.renderCard ? this.renderCard(row) : this.visibleColumns.map(
          (c5) => b2`<div class="rrow"><span class="rk">${c5.header}</span><span class="rv">${c5.render ? c5.render(row) : this.cell(c5, row)}</span></div>`
        )}
                </ion-card-content>
                ${this.actions.length ? b2`<div class="ractions" @click=${(e6) => e6.stopPropagation()}>${this.actionButtons(row)}</div>` : A}
              </ion-card>
            `;
      }
    )}
      </div>
    `;
  }
};
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "columns");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "rows");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "searchKeys");
__decorateClass5([
  n4({ attribute: "row-key-field" })
], _OkDataTable.prototype, "rowKeyField");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "rowKey");
__decorateClass5([
  n4({ type: Number, attribute: "page-size" })
], _OkDataTable.prototype, "pageSize");
__decorateClass5([
  n4({ attribute: "empty-message" })
], _OkDataTable.prototype, "emptyMessage");
__decorateClass5([
  n4({ attribute: "search-placeholder" })
], _OkDataTable.prototype, "searchPlaceholder");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "labels");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "actions");
__decorateClass5([
  n4({ type: Boolean })
], _OkDataTable.prototype, "addable");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "pageSizeOptions");
__decorateClass5([
  n4({ type: Boolean, reflect: true })
], _OkDataTable.prototype, "fill");
__decorateClass5([
  n4({ type: Boolean, attribute: "column-picker" })
], _OkDataTable.prototype, "columnPicker");
__decorateClass5([
  n4({ type: Boolean })
], _OkDataTable.prototype, "csv");
__decorateClass5([
  n4({ attribute: "csv-name" })
], _OkDataTable.prototype, "csvName");
__decorateClass5([
  n4({ type: Boolean, attribute: "server-side" })
], _OkDataTable.prototype, "serverSide");
__decorateClass5([
  n4({ type: Number })
], _OkDataTable.prototype, "total");
__decorateClass5([
  n4({ type: Number })
], _OkDataTable.prototype, "page");
__decorateClass5([
  n4({ type: Boolean })
], _OkDataTable.prototype, "searchable");
__decorateClass5([
  n4({ type: String })
], _OkDataTable.prototype, "search");
__decorateClass5([
  n4({ type: String })
], _OkDataTable.prototype, "sort");
__decorateClass5([
  n4({ attribute: "sort-dir" })
], _OkDataTable.prototype, "sortDir");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "filterValues");
__decorateClass5([
  n4()
], _OkDataTable.prototype, "title");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "views");
__decorateClass5([
  n4({ attribute: "default-view" })
], _OkDataTable.prototype, "defaultView");
__decorateClass5([
  n4({ type: Boolean })
], _OkDataTable.prototype, "exportable");
__decorateClass5([
  n4({ type: Boolean })
], _OkDataTable.prototype, "importable");
__decorateClass5([
  n4({ type: Boolean, attribute: "column-selector" })
], _OkDataTable.prototype, "columnSelector");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "pageSizes");
__decorateClass5([
  n4({ type: Boolean, attribute: "row-clickable" })
], _OkDataTable.prototype, "rowClickable");
__decorateClass5([
  n4({ type: Boolean })
], _OkDataTable.prototype, "selectable");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "selectedKeys");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "primaryAction");
__decorateClass5([
  n4({ type: Boolean })
], _OkDataTable.prototype, "inlineFilters");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "menuActions");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "cardTitle");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "cardIcon");
__decorateClass5([
  n4({ attribute: false })
], _OkDataTable.prototype, "renderCard");
__decorateClass5([
  n4({ type: String })
], _OkDataTable.prototype, "testid");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "q");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "clientPage");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "clientPageSize");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "mobileShown");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "clientSort");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "clientSortDir");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "clientFilters");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "filterDraft");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "serverFilters");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "panel");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "viewMode");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "isMobile");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "xOverflow");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "actionsTrackPx");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "rowActionsCollapsed");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "rowMenuOpen");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "hiddenKeys");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "internalSelection");
__decorateClass5([
  r5()
], _OkDataTable.prototype, "menuOpen");
var OkDataTable = _OkDataTable;
define("ok-data-table", OkDataTable);

// @erplora/module-sdk/src/quantity.ts
var QUANTITY_SCALE = 1e6;
function toMicro(quantity) {
  return Math.round(quantity * QUANTITY_SCALE);
}

// @erplora/module-sdk/src/index.ts
function dataTableShowsLoadError() {
  const registry = globalThis.customElements;
  const table = registry?.get("ok-data-table");
  return !!table && "error" in table.prototype;
}
function isEmpty(v3) {
  return v3 === null || v3 === void 0 || v3 === "";
}
var ListController = class {
  constructor(client, queryName, onChange = () => {
  }, opts = {}) {
    this.client = client;
    this.queryName = queryName;
    this.onChange = onChange;
    this.rows = [];
    this.total = 0;
    this.loading = false;
    this.error = "";
    /** Descarta respuestas obsoletas si llegan fuera de orden (race de cargas concurrentes). */
    this.seq = 0;
    this.state = {
      page: 0,
      pageSize: opts.pageSize ?? 50,
      search: "",
      sort: opts.sort,
      dir: opts.dir ?? "asc",
      filters: { ...opts.filters ?? {} },
      context: { ...opts.context ?? {} }
    };
    this.moneyFilters = new Set(opts.moneyFilters ?? []);
    this.quantityFilters = new Set(opts.quantityFilters ?? []);
    if (this.moneyFilters.size > 0 && typeof client.currencyDecimals !== "number") {
      throw new ErploraError(
        "list_money_filters_need_currency_decimals",
        "moneyFilters needs a list client that exposes currencyDecimals"
      );
    }
  }
  /**
   * The filters as the runtime compares them: money and quantity columns scaled from what the
   * person typed to the stored integer. `state.filters` stays as typed, so a table that echoes it
   * back keeps showing «12», not «1200».
   */
  wireFilters() {
    if (this.moneyFilters.size === 0 && this.quantityFilters.size === 0) return this.state.filters;
    const decimals = this.client.currencyDecimals ?? 0;
    const out = {};
    for (const [col, value] of Object.entries(this.state.filters)) {
      const scale = this.moneyFilters.has(col) ? (n6) => majorToMinor(n6, decimals) : this.quantityFilters.has(col) ? toMicro : null;
      out[col] = scale ? scaleFilterValue(value, scale) : value;
    }
    return out;
  }
  /** Nº de páginas según el total del servidor (mínimo 1). */
  get pageCount() {
    return Math.max(1, Math.ceil(this.total / this.state.pageSize));
  }
  /**
   * (Re)loads the current page from the server. On a phone, after «Load more» (hub#2365), the
   * current page is everything shown so far: a refresh brings back pages 0..page in one request.
   */
  async load() {
    const s5 = this.state;
    const mySeq = ++this.seq;
    const paging = mobilePagingOf(this);
    const window2 = nextListWindow(paging, s5);
    this.loading = true;
    this.error = "";
    this.onChange();
    try {
      const page = await this.client.queryPage(this.queryName, {
        limit: window2.limit,
        offset: window2.offset,
        search: s5.search,
        sort: s5.sort,
        dir: s5.dir,
        filters: this.wireFilters(),
        params: s5.context
      });
      if (mySeq !== this.seq) return;
      const rows = page.rows ?? [];
      this.rows = window2.append ? [...this.rows, ...rows] : rows;
      this.total = page.total ?? this.rows.length;
      if (window2.growsTo !== void 0) {
        s5.page = window2.growsTo;
        keepAccumulating(paging, () => void this.load());
      }
    } catch (e6) {
      if (mySeq !== this.seq) return;
      this.rows = [];
      this.total = 0;
      const reason = e6 instanceof Error ? e6.message.trim() : "";
      this.error = reason || listLoadFailedMessage(activeLocale());
    } finally {
      if (mySeq === this.seq) {
        this.loading = false;
        this.onChange();
      }
    }
  }
  /**
   * Goes to `page`. On a phone `<ok-data-table>` has no pager, only «Load more», which asks for
   * `page + 1`: that one is ADDED under the rows already shown (hub#2365). Any other jump replaces.
   */
  setPage(page) {
    const next = Math.max(0, page);
    const paging = mobilePagingOf(this);
    if (next === this.state.page + 1 && phoneViewport()?.matches) {
      paging.growNext = true;
    } else {
      stopAccumulating(paging);
      this.state.page = next;
    }
    void this.load();
  }
  setSort(sort, dir) {
    this.state.sort = sort;
    this.state.dir = dir;
    this.state.page = 0;
    void this.load();
  }
  setSearch(search) {
    this.state.search = search;
    this.state.page = 0;
    void this.load();
  }
  /** Cambia el nº de filas por página y recarga desde la página 0. */
  setPageSize(pageSize) {
    this.state.pageSize = Math.max(1, pageSize);
    this.state.page = 0;
    void this.load();
  }
  /** Aplica/quita un filtro de columna; valores vacíos lo eliminan. Vuelve a la página 0. */
  setFilter(col, value) {
    if (isEmpty(value)) {
      delete this.state.filters[col];
    } else if (typeof value === "object" && value !== null) {
      const prev = this.state.filters[col] ?? {};
      const merged = { ...prev, ...value };
      const cleaned = Object.fromEntries(Object.entries(merged).filter(([, v3]) => !isEmpty(v3)));
      if (Object.keys(cleaned).length === 0) delete this.state.filters[col];
      else this.state.filters[col] = cleaned;
    } else {
      this.state.filters[col] = value;
    }
    this.state.page = 0;
    void this.load();
  }
  /** Fija/actualiza los params de contexto obligatorios (p.ej. al seleccionar el padre).
   *  Vuelve a la página 0 y recarga. Pasa `{}` o keys con valor vacío para limpiar. */
  setContext(context) {
    this.state.context = { ...context };
    this.state.page = 0;
    void this.load();
  }
  reset() {
    this.state.page = 0;
    this.state.search = "";
    this.state.filters = {};
    void this.load();
  }
};
var PHONE_MEDIA = "(max-width: 640px)";
function phoneViewport() {
  const matchMedia = globalThis.matchMedia;
  return typeof matchMedia === "function" ? matchMedia(PHONE_MEDIA) : null;
}
var mobilePaging = /* @__PURE__ */ new WeakMap();
function mobilePagingOf(ctrl) {
  let paging = mobilePaging.get(ctrl);
  if (!paging) {
    paging = { accumulated: false, growNext: false };
    mobilePaging.set(ctrl, paging);
  }
  return paging;
}
function nextListWindow(paging, s5) {
  const size = s5.pageSize;
  const grow = paging.growNext;
  paging.growNext = false;
  if (grow) {
    const target = s5.page + 1;
    if (paging.accumulated || s5.page === 0) {
      return { offset: target * size, limit: size, append: true, growsTo: target };
    }
    return { offset: 0, limit: (target + 1) * size, append: false, growsTo: target };
  }
  if (s5.page === 0) stopAccumulating(paging);
  if (paging.accumulated) return { offset: 0, limit: (s5.page + 1) * size, append: false };
  return { offset: s5.page * size, limit: size, append: false };
}
function keepAccumulating(paging, reload) {
  paging.accumulated = true;
  if (paging.unwatch) return;
  const viewport = phoneViewport();
  if (!viewport?.addEventListener) return;
  const onChange = (e6) => {
    if (e6.matches) return;
    stopAccumulating(paging);
    reload();
  };
  viewport.addEventListener("change", onChange);
  paging.unwatch = () => viewport.removeEventListener?.("change", onChange);
}
function stopAccumulating(paging) {
  paging.accumulated = false;
  paging.unwatch?.();
  paging.unwatch = void 0;
}
function scaleFilterEdge(edge, scale) {
  const text = typeof edge === "string" ? edge.trim().replace(",", ".") : edge;
  if (text === "" || text === null || text === void 0) return "";
  const n6 = Number(text);
  return Number.isFinite(n6) ? scale(n6) : "";
}
function scaleFilterValue(value, scale) {
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([edge, v3]) => [edge, scaleFilterEdge(v3, scale)])
    );
  }
  return scaleFilterEdge(value, scale);
}
var LIST_LOAD_FAILED_EN = "The hub did not return the data.";
var LIST_LOAD_FAILED_ES = "El hub no ha devuelto los datos.";
function listLoadFailedMessage(locale) {
  return locale.toLowerCase().startsWith("en") ? LIST_LOAD_FAILED_EN : LIST_LOAD_FAILED_ES;
}
function createListController(client, queryName, onChange = () => {
}, opts = {}) {
  return new ListController(client, queryName, onChange, opts);
}
var ErploraError = class extends Error {
  constructor(code, message, permission, fields) {
    super(message);
    this.code = code;
    this.permission = permission;
    this.fields = fields;
    this.name = "ErploraError";
  }
};
function activeLocale() {
  try {
    return localStorage.getItem("erplora.locale") || "es";
  } catch {
    return "es";
  }
}
function majorToMinor(amount, decimals) {
  const n6 = Number(amount);
  return Number.isFinite(n6) ? Math.round(n6 * 10 ** decimals) : 0;
}
function eurosToCents(euros) {
  return majorToMinor(euros, 2);
}

// ui/components/erp-verifactu-contingency/erp-verifactu-contingency.ts
var CATALOG3 = { es: es_default, en: en_default };
function erplora3() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var ErpVerifactuContingency = class extends i3 {
  constructor() {
    super(...arguments);
    this.error = "";
    this.busy = false;
    this.tick = 0;
    // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
    // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
    // sola vez tras el primer render, considera firstUpdated() en su lugar.
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .err { color:#d9480f; font-weight:600; }
    .actions { display:flex; gap:.35rem; }
  `;
  }
  get columns() {
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    return [
      { key: "record_id", header: t5("ui.colRecord"), sortable: true, filterable: true, filterType: "text" },
      { key: "priority", header: t5("ui.colPriority"), align: "right", sortable: true, filterable: true, filterType: "text" },
      { key: "attempts", header: t5("ui.colAttempts"), align: "right", sortable: true, filterable: true, filterType: "text" },
      { key: "status", header: t5("ui.colStatus"), sortable: true, filterable: true, filterType: "text" },
      {
        key: "next_attempt_at",
        header: t5("ui.colNextAttempt"),
        sortable: true,
        filterable: true,
        filterType: "daterange",
        format: (r6) => r6.next_attempt_at ?? "\u2014"
      },
      {
        key: "last_error",
        header: t5("ui.colLastError"),
        sortable: true,
        filterable: true,
        filterType: "text",
        format: (r6) => (r6.last_error || "").slice(0, 80)
      }
    ];
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    this.ctrl = createListController(erplora3(), "verifactu.contingency.list", () => this.requestUpdate(), {
      pageSize: 50,
      sort: "id",
      dir: "asc"
    });
    await this.ctrl.load();
    try {
      const off1 = erplora3().on("verifactu.contingency.retried", () => this.ctrl.load());
      const off2 = erplora3().on("verifactu.contingency.cancelled", () => this.ctrl.load());
      const off3 = erplora3().on("verifactu.contingency.processed", () => this.ctrl.load());
      this.unsub = () => {
        off1();
        off2();
        off3();
      };
    } catch {
    }
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
    this.unsub?.();
  }
  async processQueue() {
    this.busy = true;
    this.error = "";
    try {
      await erplora3().command("verifactu.contingency.process", { limit: 100 });
      await this.ctrl.load();
    } catch (e6) {
      this.error = e6 instanceof Error ? e6.message : erplora3().t(CATALOG3, "ui.errProcessQueue");
    } finally {
      this.busy = false;
    }
  }
  async retry(queueId) {
    this.busy = true;
    this.error = "";
    try {
      await erplora3().command("verifactu.contingency.retry", { queue_id: queueId });
      await this.ctrl.load();
    } catch (e6) {
      this.error = e6 instanceof Error ? e6.message : erplora3().t(CATALOG3, "ui.errRetry");
    } finally {
      this.busy = false;
    }
  }
  async cancel(queueId) {
    this.busy = true;
    this.error = "";
    try {
      await erplora3().command("verifactu.contingency.cancel", { queue_id: queueId });
      await this.ctrl.load();
    } catch (e6) {
      const message = e6 instanceof Error ? e6.message : "";
      this.error = message.includes("verifactu__gate") ? erplora3().t(CATALOG3, "ui.errCancelRequiredRecord") : message || erplora3().t(CATALOG3, "ui.errCancel");
    } finally {
      this.busy = false;
    }
  }
  render() {
    const t5 = (k2) => erplora3().t(CATALOG3, k2);
    return b2`<div>
        <header>
          <h2>${t5("ui.contingencyTitle")}</h2>
          <ion-button size="small" ?disabled=${this.busy} @click=${() => this.processQueue()}>${this.busy ? t5("ui.processing") : t5("ui.processQueue")}</ion-button>
        </header>
        ${this.error ? b2`<p class="err">${this.error}</p>` : A}
        ${this.ctrl?.error && !dataTableShowsLoadError() ? b2`<p class="err" data-testid="verifactu-contingency-load-error">${this.ctrl.error}</p>` : A}
        <ok-data-table testid="verifactu-contingency-table" .error=${this.ctrl?.error ?? ""} @retry=${() => this.ctrl?.load()} .serverSide=${true} .views=${true} .cardTitle=${(row) => String(row.record_id ?? row.id ?? "")} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? "asc"} .searchable=${true} .searchPlaceholder=${t5("ui.contingencySearchPlaceholder")} .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.contingencyEmpty")} .actions=${[
      { id: "retry", label: t5("ui.actionRetry"), icon: "refresh-outline" },
      { id: "cancel", label: t5("ui.actionCancel"), icon: "close-circle-outline", color: "danger" }
    ]} @rowAction=${(e6) => {
      const { actionId, row } = e6.detail;
      if (actionId === "retry") this.retry(row.id);
      else if (actionId === "cancel") this.cancel(row.id);
    }} @pageChange=${(e6) => this.ctrl.setPage(e6.detail)} @sortChange=${(e6) => this.ctrl.setSort(e6.detail.sort, e6.detail.dir)} @searchChange=${(e6) => this.ctrl.setSearch(e6.detail)} @filterChange=${(e6) => this.ctrl.setFilter(e6.detail.col, e6.detail.value)}></ok-data-table>
      </div>`;
  }
};
__decorateClass([
  r5()
], ErpVerifactuContingency.prototype, "error", 2);
__decorateClass([
  r5()
], ErpVerifactuContingency.prototype, "busy", 2);
__decorateClass([
  r5()
], ErpVerifactuContingency.prototype, "tick", 2);
define("erp-verifactu-contingency", ErpVerifactuContingency);

// ui/lib/event-message.ts
var EVENT_MESSAGE_PREFIX = "verifactu.";
var EVENT_CATALOG_PREFIX = "ui.evt.";
var EVENT_REASON_PREFIX = "ui.evt.reason.";
var PARAM_LABEL_KEYS = {
  record_type: { alta: "ui.recTypeAlta", anulacion: "ui.recTypeAnulacion" },
  environment: { testing: "ui.envTesting", production: "ui.envProduction" }
};
var SAFE_SUFFIX = /^[a-z][a-z0-9_]*$/;
var REASON_FACT_SUFFIX = "_reason";
var MONEY_FACTS = {
  schema_simplified_over_ceiling: ["total", "ceiling", "tolerance"]
};
var DECIMAL_AMOUNT = /^-?\d+(\.\d{1,2})?$/;
function moneyFact(facts, name) {
  const cents = facts[`${name}_cents`];
  if (typeof cents === "number" && Number.isInteger(cents)) return cents;
  const legacy = facts[name];
  return typeof legacy === "string" && DECIMAL_AMOUNT.test(legacy) ? eurosToCents(legacy) : void 0;
}
function catalogKeyFor(messageKey) {
  if (!messageKey.startsWith(EVENT_MESSAGE_PREFIX)) return null;
  const suffix = messageKey.slice(EVENT_MESSAGE_PREFIX.length);
  return SAFE_SUFFIX.test(suffix) ? `${EVENT_CATALOG_PREFIX}${suffix}` : null;
}
function parseDetails(raw2) {
  if (raw2 && typeof raw2 === "object" && !Array.isArray(raw2)) {
    return raw2;
  }
  if (typeof raw2 !== "string" || raw2.trim() === "") return {};
  try {
    const parsed = JSON.parse(raw2);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
function catalogHas(catalog, locale, key) {
  for (const lang of [locale, "en"]) {
    let cursor = catalog[lang];
    for (const part of key.split(".")) {
      cursor = cursor && typeof cursor === "object" ? cursor[part] : void 0;
    }
    if (typeof cursor === "string" && cursor.length > 0) return true;
  }
  return false;
}
function localizedParams(catalog, locale, t5, details, money) {
  const params = {};
  for (const [param, value] of Object.entries(details)) {
    if (value === null || value === void 0 || typeof value === "object") continue;
    const labelKey = typeof value === "string" ? PARAM_LABEL_KEYS[param]?.[value] : void 0;
    params[param] = labelKey ? t5(catalog, labelKey) : value;
  }
  for (const [param, value] of Object.entries(details)) {
    if (!param.endsWith(REASON_FACT_SUFFIX)) continue;
    const nested = reasonSentence(catalog, locale, t5, value, money);
    if (nested !== void 0) params[param.slice(0, -REASON_FACT_SUFFIX.length)] = nested;
  }
  if (money) {
    for (const name of MONEY_FACTS[String(details.code)] ?? []) {
      const minor = moneyFact(details, name);
      if (minor !== void 0) params[name] = money(minor);
    }
  }
  return params;
}
function reasonSentence(catalog, locale, t5, raw2, money) {
  if (!raw2 || typeof raw2 !== "object" || Array.isArray(raw2)) return void 0;
  const reason = raw2;
  const code = reason.code;
  if (typeof code !== "string" || !SAFE_SUFFIX.test(code)) return void 0;
  const key = `${EVENT_REASON_PREFIX}${code}`;
  if (!catalogHas(catalog, locale, key)) return void 0;
  return t5(catalog, key, localizedParams(catalog, locale, t5, reason, money));
}
function certReasonSentence(catalog, locale, t5, details, money) {
  return reasonSentence(catalog, locale, t5, details.cert_reason, money);
}
function eventMessage(catalog, locale, t5, row, money) {
  const details = parseDetails(row.details);
  const messageKey = details.message_key;
  if (typeof messageKey !== "string") return row.message;
  const key = catalogKeyFor(messageKey);
  if (!key || !catalogHas(catalog, locale, key)) return row.message;
  const params = localizedParams(catalog, locale, t5, details, money);
  const reason = certReasonSentence(catalog, locale, t5, details, money);
  if (reason !== void 0) params.cert_message = reason;
  return t5(catalog, key, params);
}

// ui/lib/event-labels.ts
var ENGINE_EVENT_TYPES = [
  "record_created",
  "invoice_type_downgraded",
  "transmission_deferred",
  "transmission_success",
  "transmission_warning",
  "transmission_failure",
  "contingency_processed",
  "chain_validated",
  "chain_error",
  "aeat_queried",
  "chain_recovered",
  "diagnostic"
];
var EVENT_TYPE_CATALOG_PREFIX = "ui.evtType.";
var SEVERITY_LABEL_KEYS = {
  debug: "ui.sevDebug",
  info: "ui.sevInfo",
  warning: "ui.sevWarning",
  error: "ui.sevError",
  critical: "ui.sevCritical"
};
var EVENT_SEVERITIES = Object.keys(SEVERITY_LABEL_KEYS);
function raw(code) {
  return code === null || code === void 0 ? "" : String(code);
}
function eventTypeLabel(catalog, locale, t5, code) {
  if (typeof code !== "string") return raw(code);
  const key = `${EVENT_TYPE_CATALOG_PREFIX}${code}`;
  return catalogHas(catalog, locale, key) ? t5(catalog, key) : code;
}
function severityLabel(catalog, _locale, t5, code) {
  if (typeof code !== "string" || !Object.hasOwn(SEVERITY_LABEL_KEYS, code)) return raw(code);
  return t5(catalog, SEVERITY_LABEL_KEYS[code]);
}

// ui/lib/event-time.ts
function usableZone(timezone) {
  if (!timezone) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return timezone;
  } catch {
    return "UTC";
  }
}
function formatEventTime(value, opts) {
  const raw2 = value == null ? "" : String(value);
  if (!raw2) return "";
  const instant = new Date(raw2);
  if (Number.isNaN(instant.getTime())) return raw2;
  try {
    return new Intl.DateTimeFormat(opts.locale || "es", {
      timeZone: usableZone(opts.timezone),
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).format(instant);
  } catch {
    return raw2;
  }
}

// ui/components/erp-verifactu-events/erp-verifactu-events.ts
var CATALOG4 = { es: es_default, en: en_default };
function erplora4() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var ErpVerifactuEvents = class extends i3 {
  constructor() {
    super(...arguments);
    this.tick = 0;
    /** The mobile card is titled by the event's type, in words — the Message says the rest. */
    this.cardTitle = (row) => {
      const client = erplora4();
      const translate = (catalog, key, params) => client.t(catalog, key, params);
      return row.event_type ? eventTypeLabel(CATALOG4, client.locale, translate, row.event_type) : String(row.message ?? "");
    };
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .err { color:#d9480f; font-weight:600; }
  `;
  }
  get columns() {
    const client = erplora4();
    const t5 = (k2) => client.t(CATALOG4, k2);
    const translate = (catalog, key, params) => client.t(catalog, key, params);
    return [
      {
        key: "timestamp",
        header: t5("ui.colWhen"),
        sortable: true,
        filterable: true,
        filterType: "daterange",
        // verifactu#141: the CELL reads as a date and time on the hub clock; sorting and the date
        // range still travel to the query over the stored ISO text.
        format: (r6) => formatEventTime(r6.timestamp, { locale: client.locale, timezone: client.timezone ?? "" })
      },
      {
        key: "severity",
        header: t5("ui.colSeverity"),
        sortable: true,
        filterable: true,
        filterType: "select",
        options: EVENT_SEVERITIES.map((code) => ({ value: code, label: severityLabel(CATALOG4, client.locale, translate, code) })),
        // verifactu#134: the CELL says the word; the stored code, the sort and the `eq` filter stay
        // on the code. `format` and not `render`, for the same reason as the Message column below.
        format: (r6) => severityLabel(CATALOG4, client.locale, translate, r6.severity)
      },
      {
        key: "event_type",
        header: t5("ui.colType"),
        sortable: true,
        filterable: true,
        // A select and not a text box: the list compares `event_type` with `eq`, so a typed word only
        // ever matched when the owner knew the internal code.
        filterType: "select",
        options: ENGINE_EVENT_TYPES.map((code) => ({ value: code, label: eventTypeLabel(CATALOG4, client.locale, translate, code) })),
        format: (r6) => eventTypeLabel(CATALOG4, client.locale, translate, r6.event_type)
      },
      {
        key: "message",
        header: t5("ui.colMessage"),
        sortable: true,
        filterable: true,
        filterType: "text",
        // verifactu#63: the sentence is built from `details.message_key` against this module's
        // catalogue, so the fiscal audit trail speaks the reader's language. `message` — Spanish
        // prose formatted by the engine — stays as the fallback for a key we do not know.
        //
        // `format` and not `render`: the table is `serverSide`, so sorting and filtering travel to
        // the query over the raw column and only the CELL changes. A `render` would also have to
        // return a template for something that is a sentence.
        format: (r6) => eventMessage(CATALOG4, client.locale, translate, {
          message: String(r6.message ?? ""),
          details: r6.details
        }, (minor) => client.formatMoney(minor))
      }
    ];
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    this.ctrl = createListController(erplora4(), "verifactu.events.list", () => this.requestUpdate(), {
      pageSize: 50,
      // verifactu#144: an activity log opens on what just happened — the manifest's default too.
      sort: "timestamp",
      dir: "desc"
    });
    await this.ctrl.load();
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
  }
  render() {
    const t5 = (k2) => erplora4().t(CATALOG4, k2);
    return b2`<div>
        <header>
          <h2>${t5("ui.eventsTitle")}</h2>
        </header>
        ${this.ctrl?.error && !dataTableShowsLoadError() ? b2`<p class="err" data-testid="verifactu-events-load-error">${this.ctrl.error}</p>` : A}
        <ok-data-table testid="verifactu-events-table" .error=${this.ctrl?.error ?? ""} @retry=${() => this.ctrl?.load()} .serverSide=${true} .views=${true} .cardTitle=${this.cardTitle} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? "asc"} .searchable=${true} .searchPlaceholder=${t5("ui.eventsSearchPlaceholder")} .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.eventsEmpty")} @pageChange=${(e6) => this.ctrl.setPage(e6.detail)} @sortChange=${(e6) => this.ctrl.setSort(e6.detail.sort, e6.detail.dir)} @searchChange=${(e6) => this.ctrl.setSearch(e6.detail)} @filterChange=${(e6) => this.ctrl.setFilter(e6.detail.col, e6.detail.value)}></ok-data-table>
      </div>`;
  }
};
__decorateClass([
  r5()
], ErpVerifactuEvents.prototype, "tick", 2);
define("erp-verifactu-events", ErpVerifactuEvents);

// @erplora/outfitkit/dist/ok-timeline.js
var __defProp6 = Object.defineProperty;
var __decorateClass6 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp6(target, key, result);
  return result;
};
var OkTimeline = class extends i3 {
  constructor() {
    super(...arguments);
    this.items = [];
    this.align = "left";
  }
  static {
    this.styles = i`
    :host {
      /* Vars overridable (estilo Ionic), default = cadena --ok-* -> --ion-* -> hex */
      --color: var(--ok-text, var(--ion-text-color, #1c1b17));
      --color-muted: var(--ok-text-muted, rgba(var(--ion-text-color-rgb, 28, 27, 23), 0.55));
      --primary-color: var(--ok-primary, var(--ion-color-primary, #3880ff));
      --primary-contrast: var(--ok-primary-contrast, var(--ion-color-primary-contrast, #ffffff));
      --done-color: var(--ok-success, var(--ion-color-success, #2dd36f));
      --pending-color: var(--ok-medium, var(--ion-color-medium, #92949c));
      --line-color: var(--ok-border-soft, rgba(var(--ion-text-color-rgb, 28, 27, 23), 0.14));
      --hover-bg: var(--ok-hover, rgba(var(--ion-text-color-rgb, 28, 27, 23), 0.06));
      --current-bg: var(
        --ok-current-bg,
        rgba(var(--ion-color-primary-rgb, 56, 128, 255), 0.1)
      );
      --border-radius: var(--ok-radius, 8px);
      --dot-size: var(--ok-timeline-dot, 28px);
      --gutter: var(--ok-timeline-gutter, 14px);
      --font: var(--ok-font, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif);

      /* Por defecto ocupa el ancho del contenedor y es responsive. */
      display: block;
      width: 100%;
      color: var(--color);
      font-family: var(--font);
      font-size: 0.95rem;
    }

    .timeline {
      position: relative;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    /* Item: rejilla [punto | contenido]. La línea vertical se dibuja en la columna del punto. */
    .item {
      position: relative;
      display: grid;
      grid-template-columns: var(--dot-size) 1fr;
      column-gap: var(--gutter);
      padding: 0.15rem 0 0.9rem;
    }
    .item:last-child {
      padding-bottom: 0;
    }

    /* Columna del punto: contiene el dot y el segmento de línea que baja al siguiente. */
    .marker {
      position: relative;
      display: flex;
      justify-content: center;
    }
    /* Segmento de línea: arranca bajo el dot y llega al final del item. */
    .marker::before {
      content: '';
      position: absolute;
      top: var(--dot-size);
      bottom: calc(-0.9rem);
      left: 50%;
      width: 2px;
      transform: translateX(-50%);
      background: var(--line-color);
    }
    .item:last-child .marker::before {
      display: none;
    }

    .dot {
      position: relative;
      z-index: 1;
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--dot-size);
      height: var(--dot-size);
      border-radius: 50%;
      background: var(--dot-color, var(--pending-color));
      color: var(--dot-contrast, #ffffff);
      box-shadow: 0 0 0 3px var(--ok-surface, var(--ion-background-color, #ffffff));
    }
    .dot ion-icon {
      font-size: calc(var(--dot-size) * 0.5);
    }

    /* Contenido del hito; es un botón accesible para emitir el click. */
    .content {
      min-width: 0;
      text-align: left;
      width: 100%;
      margin: 0;
      padding: 0.35rem 0.55rem;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
      border-radius: var(--border-radius);
      transition: background-color var(--ok-transition, 150ms ease),
        color var(--ok-transition, 150ms ease), border-color var(--ok-transition, 150ms ease),
        box-shadow var(--ok-transition, 150ms ease), transform 120ms ease;
    }
    @media (hover: hover) {
      .content:hover {
        background: var(--hover-bg);
      }
    }
    .content:active {
      transform: scale(var(--ok-press-scale, 0.97));
    }
    @media (prefers-reduced-motion: reduce) {
      .content:active {
        transform: none;
      }
    }
    .item.current .content {
      background: var(--current-bg);
    }

    .head {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .title {
      font-weight: 600;
      min-width: 0;
    }
    .item.current .title {
      color: var(--primary-color);
    }
    .time {
      font-size: 0.8rem;
      color: var(--color-muted);
      white-space: nowrap;
    }
    .desc {
      margin-top: 0.2rem;
      color: var(--color-muted);
      font-size: 0.88rem;
      line-height: 1.35;
    }

    /* Modo alternado (solo en pantallas anchas): los items pares van a la derecha. */
    @media (min-width: 640px) {
      .timeline.alternate .item {
        grid-template-columns: 1fr var(--dot-size) 1fr;
      }
      .timeline.alternate .marker {
        grid-column: 2;
        order: 0;
      }
      .timeline.alternate .item .content {
        grid-column: 3;
      }
      .timeline.alternate .item.alt .content {
        grid-column: 1;
        text-align: right;
      }
      .timeline.alternate .item.alt .head {
        justify-content: flex-end;
      }
    }
  `;
  }
  // Resuelve el color del punto: explícito en el item, o derivado del status.
  dotColor(item) {
    if (item.color) {
      return /^[a-z-]+$/.test(item.color) ? `var(--ion-color-${item.color}, ${item.color})` : item.color;
    }
    switch (item.status) {
      case "done":
        return "var(--done-color)";
      case "current":
        return "var(--primary-color)";
      default:
        return "var(--pending-color)";
    }
  }
  // Emite `ok-item-click` con el item pulsado.
  emitClick(item) {
    this.dispatchEvent(
      new CustomEvent("ok-item-click", {
        detail: { id: item.id, item },
        bubbles: true,
        composed: true
      })
    );
  }
  renderItem(item, index) {
    const isCurrent = item.status === "current";
    const isAlt = this.align === "alternate" && index % 2 === 1;
    const classes = ["item", isCurrent ? "current" : "", isAlt ? "alt" : ""].filter(Boolean).join(" ");
    const dotStyle = `--dot-color: ${this.dotColor(item)}`;
    return b2`<li class=${classes}>
      <span class="marker">
        <span class="dot" style=${dotStyle}>
          ${item.icon ? b2`<ion-icon .icon=${okIcon(item.icon)}></ion-icon>` : ""}
        </span>
      </span>
      <button
        type="button"
        class="content"
        @click=${() => this.emitClick(item)}
      >
        <span class="head">
          <span class="title">${item.title}</span>
          ${item.time ? b2`<span class="time">${item.time}</span>` : ""}
        </span>
        ${item.description ? b2`<div class="desc">${item.description}</div>` : ""}
      </button>
    </li>`;
  }
  render() {
    const listClass = `timeline ${this.align === "alternate" ? "alternate" : ""}`.trim();
    return b2`<ul class=${listClass}>
      ${this.items.map((item, i7) => this.renderItem(item, i7))}
    </ul>`;
  }
};
__decorateClass6([
  n4({ attribute: false })
], OkTimeline.prototype, "items");
__decorateClass6([
  n4()
], OkTimeline.prototype, "align");
define("ok-timeline", OkTimeline);

// @erplora/outfitkit/dist/ok-empty-state.js
var __defProp7 = Object.defineProperty;
var __decorateClass7 = (decorators, target, key, kind) => {
  var result = void 0;
  for (var i7 = decorators.length - 1, decorator; i7 >= 0; i7--)
    if (decorator = decorators[i7])
      result = decorator(target, key, result) || result;
  if (result) __defProp7(target, key, result);
  return result;
};
var OkEmptyState = class extends i3 {
  constructor() {
    super(...arguments);
    this.icon = "file-tray-outline";
  }
  static {
    this.styles = i`
    /* Ancho máximo del contenedor; bloque a 100%. */
    :host {
      display: block;
      width: 100%;
      /* Tokens propios estilo Ionic (overridables): --ok-* → --ion-* → hex. */
      --icon-color: var(--ok-color-medium, var(--ion-color-medium, #92949c));
      --heading-color: var(--ok-text-color, var(--ion-text-color, #1f2933));
      --message-color: var(--ok-color-medium, var(--ion-color-medium, #92949c));
      --icon-size: 64px;
      --padding: 2.5rem 1.25rem;
    }

    /* Centrado vertical y horizontal del contenido. */
    .wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 0.5rem;
      padding: var(--padding);
      box-sizing: border-box;
      width: 100%;
    }

    ion-icon {
      font-size: var(--icon-size);
      color: var(--icon-color);
      opacity: 0.5; /* atenuado */
      margin-bottom: 0.25rem;
    }

    .heading {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--heading-color);
    }

    .message {
      margin: 0;
      font-size: 0.9375rem;
      color: var(--message-color);
      max-width: 38ch;
    }

    /* Acción debajo del texto. */
    .action {
      margin-top: 1rem;
    }

    /* Oculta los wrappers si no hay contenido. */
    .heading:empty,
    .message:empty {
      display: none;
    }
  `;
  }
  render() {
    return b2`
      <div class="wrap">
        <ion-icon .icon=${okIcon(this.icon)} aria-hidden="true"></ion-icon>
        ${this.heading ? b2`<h2 class="heading">${this.heading}</h2>` : null}
        ${this.message ? b2`<p class="message">${this.message}</p>` : null}
        <slot></slot>
        <div class="action">
          <slot name="action"></slot>
        </div>
      </div>
    `;
  }
};
__decorateClass7([
  n4()
], OkEmptyState.prototype, "icon");
__decorateClass7([
  n4()
], OkEmptyState.prototype, "heading");
__decorateClass7([
  n4()
], OkEmptyState.prototype, "message");
define("ok-empty-state", OkEmptyState);

// ui/components/erp-verifactu-events-widget/erp-verifactu-events-widget.ts
var CATALOG5 = { es: es_default, en: en_default };
var SEVERITY_COLOR = { warning: "warning", error: "danger", critical: "danger" };
var ErpVerifactuEventsWidget = class extends i3 {
  constructor() {
    super(...arguments);
    this.rows = null;
    this.failed = false;
    this.unsubs = [];
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display: block; }
    .loading { display: flex; align-items: center; gap: .5rem; opacity: .6; }
  `;
  }
  api() {
    const c5 = this.client ?? globalThis.erplora;
    if (!c5) throw new Error("erplora SDK not initialised by the shell");
    return c5;
  }
  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    const client = this.api();
    const reload = () => void this.load();
    this.unsubs = [
      client.on("verifactu.record.created", reload),
      client.on("verifactu.record.transmitted", reload),
      client.on("verifactu.contingency.processed", reload)
    ];
    void this.load();
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    super.disconnectedCallback();
  }
  async load() {
    try {
      const rows = await this.api().query("verifactu.stats.events_recent");
      this.rows = Array.isArray(rows) ? rows : [];
      this.failed = false;
    } catch {
      this.failed = true;
    }
  }
  items(rows) {
    const client = this.api();
    const translate = (catalog, key, params) => client.t(catalog, key, params);
    return rows.map((r6) => ({
      id: String(r6.id),
      title: eventTypeLabel(CATALOG5, client.locale, translate, r6.event_type),
      description: eventMessage(
        CATALOG5,
        client.locale,
        translate,
        { message: String(r6.message ?? ""), details: r6.details },
        (minor) => client.formatMoney(minor)
      ),
      time: formatEventTime(r6.timestamp, { locale: client.locale, timezone: client.timezone ?? "" }),
      color: SEVERITY_COLOR[r6.severity]
    }));
  }
  render() {
    const t5 = (k2) => this.api().t(CATALOG5, k2);
    if (this.failed) {
      return b2`<ok-empty-state icon="alert-circle-outline" .message=${t5("ui.eventsWidgetError")}></ok-empty-state>`;
    }
    if (this.rows === null) {
      return b2`<div class="loading"><ion-spinner name="crescent"></ion-spinner><span>${t5("ui.loading")}</span></div>`;
    }
    if (this.rows.length === 0) {
      return b2`<ok-empty-state icon="file-tray-outline" .message=${t5("ui.eventsEmpty")}></ok-empty-state>`;
    }
    return b2`<ok-timeline align="left" .items=${this.items(this.rows)}></ok-timeline>`;
  }
};
__decorateClass([
  n4({ attribute: false })
], ErpVerifactuEventsWidget.prototype, "client", 2);
__decorateClass([
  r5()
], ErpVerifactuEventsWidget.prototype, "rows", 2);
__decorateClass([
  r5()
], ErpVerifactuEventsWidget.prototype, "failed", 2);
define("erp-verifactu-events-widget", ErpVerifactuEventsWidget);

// ui/components/erp-verifactu-records/erp-verifactu-records.ts
var CATALOG6 = { es: es_default, en: en_default };
var ON_ITS_WAY = /* @__PURE__ */ new Set(["pending", "error", "retry"]);
var REASON_EVENTS = /* @__PURE__ */ new Set(["transmission_deferred", "transmission_failure"]);
var QUEUED = /* @__PURE__ */ new Set(["pending", "retrying"]);
function wallClock(iso) {
  return iso.length >= 16 ? iso.slice(0, 16).replace("T", " ") : iso;
}
var MONEY_RANGE_FILTERS = /* @__PURE__ */ new Set(["total_amount"]);
function moneyEdgeToMinor(edge, decimals) {
  const text = typeof edge === "string" ? edge.trim().replace(",", ".") : edge;
  if (text === "" || text === null || text === void 0) return "";
  const n6 = Number(text);
  return Number.isFinite(n6) ? majorToMinor(n6, decimals) : "";
}
function moneyRangeToMinor(value, decimals) {
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([edge, v3]) => [edge, moneyEdgeToMinor(v3, decimals)])
  );
}
function erplora5() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var STATUS_COLOR = {
  pending: "warning",
  retry: "warning",
  transmitted: "primary",
  accepted: "success",
  rejected: "danger",
  error: "danger"
};
var _ErpVerifactuRecords = class _ErpVerifactuRecords extends i3 {
  constructor() {
    super(...arguments);
    this.tick = 0;
    this.invoiceTotal = null;
    this.invoiceCountFailed = false;
    this.waiting = null;
    this.detail = null;
    this.detailError = "";
    this.detailLoading = false;
    // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
    // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
    // sola vez tras el primer render, considera firstUpdated() en su lugar.
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .err { color:#d9480f; font-weight:600; }
    ok-inline-feedback { display:block; margin-bottom:.75rem; }
    ok-inline-feedback ion-button { min-height:44px; }
    dl.grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:.75rem 1.5rem; margin:0 0 1rem; }
    dl.grid dt { font-size:.75rem; text-transform:uppercase; letter-spacing:.02em; color: var(--ion-color-medium, #6b6b6b); margin:0; }
    dl.grid dd { margin:.15rem 0 0; }
    section.fingerprint { border:1px solid var(--ion-color-light-shade, #e0e0e0); border-radius:8px; padding:.75rem 1rem; margin-bottom:1rem; }
    section.fingerprint h3 { margin:0 0 .5rem; font-size:.95rem; }
    code { font-family: ui-monospace, monospace; font-size:.8rem; word-break: break-all; }
  `;
  }
  get columns() {
    const t5 = (k2) => erplora5().t(CATALOG6, k2);
    const statusLabels = {
      pending: t5("ui.statusPending"),
      transmitted: t5("ui.statusTransmitted"),
      accepted: t5("ui.statusAccepted"),
      rejected: t5("ui.statusRejected"),
      error: t5("ui.statusError"),
      retry: t5("ui.statusRetry")
    };
    return [
      { key: "sequence_number", header: t5("ui.colSeq"), align: "right", sortable: true, filterable: true, filterType: "text" },
      { key: "invoice_number", header: t5("ui.colInvoice"), sortable: true, filterable: true, filterType: "text" },
      { key: "invoice_date", header: t5("ui.colDate"), sortable: true, filterable: true, filterType: "daterange" },
      {
        key: "record_type",
        header: t5("ui.colType"),
        sortable: true,
        filterable: true,
        filterType: "select",
        options: [
          { value: "alta", label: t5("ui.recTypeAlta") },
          { value: "anulacion", label: t5("ui.recTypeAnulacion") }
        ]
      },
      { key: "invoice_type", header: t5("ui.colInvoiceType"), sortable: true, filterable: true, filterType: "text" },
      { key: "issuer_name", header: t5("ui.colIssuer"), sortable: true, filterable: true, filterType: "text" },
      {
        key: "total_amount",
        header: t5("ui.colTotal"),
        align: "right",
        sortable: true,
        filterable: true,
        filterType: "range",
        format: (r6) => erplora5().formatMoney(Number(r6.total_amount))
      },
      {
        key: "status",
        header: t5("ui.colStatus"),
        sortable: true,
        filterable: true,
        filterType: "select",
        options: [
          { value: "pending", label: t5("ui.statusPending") },
          { value: "transmitted", label: t5("ui.statusTransmitted") },
          { value: "accepted", label: t5("ui.statusAccepted") },
          { value: "rejected", label: t5("ui.statusRejected") },
          { value: "error", label: t5("ui.statusError") },
          { value: "retry", label: t5("ui.statusRetry") }
        ],
        render: (r6) => {
          const s5 = r6.status;
          return b2`<ion-badge color=${STATUS_COLOR[s5] ?? "medium"}>${statusLabels[s5] ?? s5}</ion-badge>`;
        }
      }
    ];
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    this.ctrl = createListController(erplora5(), "verifactu.records.list", () => this.requestUpdate(), {
      pageSize: 50,
      sort: "id",
      dir: "asc"
    });
    await this.ctrl.load();
    await this.loadInvoiceTotal();
    try {
      const off1 = erplora5().on("verifactu.record.created", () => this.ctrl.load());
      const off2 = erplora5().on("verifactu.record.transmitted", () => this.ctrl.load());
      this.unsub = () => {
        off1();
        off2();
      };
    } catch {
    }
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
    this.unsub?.();
  }
  /**
   * How many invoices exist, so an empty chain can be told apart from an empty business.
   *
   * Reuses `invoice.list` — the module is a hard `depends_on`, and its every row is stamped
   * `status: issued` by the command that emits `invoice.created`, which is the very event this
   * module listens to. So «rows in `invoice.list`» IS «invoices the chain was meant to seal», with
   * no draft state to filter out and no new query to add. Asked for one row: only `total` is used.
   */
  async loadInvoiceTotal() {
    try {
      const page = await erplora5().queryPage("invoice.list", {
        limit: 1,
        offset: 0
      });
      this.invoiceTotal = typeof page?.total === "number" ? page.total : null;
      this.invoiceCountFailed = this.invoiceTotal === null;
    } catch {
      this.invoiceTotal = null;
      this.invoiceCountFailed = true;
    }
    this.requestUpdate();
  }
  /** Invoices were issued and NOTHING got sealed: an incident, not an empty screen. */
  get chainNotSealing() {
    return !this.ctrl?.loading && (this.ctrl?.total ?? 0) === 0 && this.invoiceTotal !== null && this.invoiceTotal > 0;
  }
  /** 0 records and 0 invoices: nothing has been sold yet, which is not a problem. */
  get nothingInvoicedYet() {
    return (this.ctrl?.total ?? 0) === 0 && this.invoiceTotal === 0;
  }
  emptyMessage(t5) {
    if (this.ctrl?.loading) return t5("ui.loading");
    if (this.nothingInvoicedYet) return t5("ui.recordsEmptyNoInvoices");
    return t5("ui.recordsEmpty");
  }
  /** Deep-links into the hub shell, the same way the Settings screen does (verifactu#49). */
  go(path) {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  /** A column filter from the table: money ranges travel in the minor unit (pm#498). */
  onFilterChange(col, value) {
    this.ctrl.setFilter(col, MONEY_RANGE_FILTERS.has(col) ? moneyRangeToMinor(value, erplora5().currencyDecimals) : value);
  }
  /**
   * Opens the detail of one record (verifactu#86) — the door `record.get` never had a screen
   * behind before this. Mirrors `invoice`'s `openDetail`: on failure or a missing row, `detail`
   * stays `null` (the list keeps rendering) and `detailError` carries what to say about it.
   */
  async openDetail(id) {
    this.detailError = "";
    this.detailLoading = true;
    try {
      const t5 = (k2) => erplora5().t(CATALOG6, k2);
      const row = await erplora5().query(
        "verifactu.records.get",
        { record_id: id }
      );
      const record = Array.isArray(row) ? row[0] : row;
      if (!record) {
        this.detailError = t5("ui.errRecordNotFound");
        return;
      }
      this.detail = record;
      void this.explainWaiting(record);
    } catch (e6) {
      this.detailError = e6 instanceof Error ? e6.message : erplora5().t(CATALOG6, "ui.errLoadDetail");
    } finally {
      this.detailLoading = false;
    }
  }
  closeDetail() {
    this.detail = null;
    this.detailError = "";
    this.waiting = null;
  }
  /**
   * WHY a record is not at the AEAT yet and WHEN it goes out on its own (verifactu#111).
   *
   * The engine sends these records by itself — in sequence order, declared as late remissions —
   * so the screen offers no button: it says what is going on. WHY is the sentence of the record's
   * own reason row, composed from its code; WHEN is its next attempt if it sits in the contingency
   * queue, and otherwise the next automatic send (every 5 minutes, once the hub can file).
   *
   * Only for a record on its way: one the AEAT holds or refused has nothing to wait for, and is
   * not worth two queries.
   */
  async explainWaiting(record) {
    this.waiting = null;
    if (!ON_ITS_WAY.has(record.status)) return;
    this.waiting = "loading";
    const client = erplora5();
    const t5 = (k2, params) => client.t(CATALOG6, k2, params);
    const filters = { record_id: record.id };
    const [events, queue] = await Promise.allSettled([
      client.queryPage("verifactu.events.list", {
        filters,
        sort: "timestamp",
        dir: "desc",
        limit: 20,
        offset: 0
      }),
      client.queryPage(
        "verifactu.contingency.list",
        { filters, limit: 1, offset: 0 }
      )
    ]);
    let why;
    if (events.status === "rejected") {
      why = t5("ui.pendingWhyUnavailable");
    } else {
      const reason = events.value.rows.find((row) => REASON_EVENTS.has(row.event_type));
      why = reason ? eventMessage(CATALOG6, client.locale, (c5, k2, p4) => client.t(c5, k2, p4), reason) : t5("ui.pendingWhyUnknown");
    }
    const entry = queue.status === "fulfilled" ? queue.value.rows.find((row) => QUEUED.has(row.status) && row.next_attempt_at) : void 0;
    const when = entry?.next_attempt_at ? t5("ui.pendingWhenQueued", { at: wallClock(entry.next_attempt_at) }) : t5("ui.pendingWhenNextSend");
    if (this.detail?.id !== record.id) return;
    this.waiting = { why, when };
  }
  renderWaiting(t5) {
    if (!this.waiting) return A;
    return b2`<ok-inline-feedback
      data-test="waiting"
      tone="warning"
      icon="hourglass-outline"
      heading=${t5("ui.pendingTitle")}
    >
      ${this.waiting === "loading" ? b2`<p>${t5("ui.loading")}</p>` : b2`<p data-test="waiting-why">${this.waiting.why}</p>
            <p data-test="waiting-when">${this.waiting.when}</p>`}
    </ok-inline-feedback>`;
  }
  /** A hash, truncated for a screen — the same 16-char convention `erp-verifactu-recovery` uses. */
  static shortHash(hash) {
    return hash ? `${hash.slice(0, 16)}\u2026` : "\u2014";
  }
  renderDetail() {
    const t5 = (k2, params) => erplora5().t(CATALOG6, k2, params);
    const d3 = this.detail;
    const statusLabels = {
      pending: t5("ui.statusPending"),
      transmitted: t5("ui.statusTransmitted"),
      accepted: t5("ui.statusAccepted"),
      rejected: t5("ui.statusRejected"),
      error: t5("ui.statusError"),
      retry: t5("ui.statusRetry")
    };
    const typeLabels = {
      alta: t5("ui.recTypeAlta"),
      anulacion: t5("ui.recTypeAnulacion")
    };
    return b2`<div>
      <header>
        <h2>${t5("ui.detailTitle", { number: d3.invoice_number })}</h2>
        <ion-badge color=${STATUS_COLOR[d3.status] ?? "medium"}>${statusLabels[d3.status] ?? d3.status}</ion-badge>
        <ion-button data-test="detail-back" fill="outline" color="medium" @click=${() => this.closeDetail()}>
          ← ${t5("ui.back")}
        </ion-button>
      </header>
      ${this.renderWaiting(t5)}
      <dl class="grid">
        <div><dt>${t5("ui.colSeq")}</dt><dd>${d3.sequence_number}</dd></div>
        <div><dt>${t5("ui.colDate")}</dt><dd>${d3.invoice_date}</dd></div>
        <div><dt>${t5("ui.colType")}</dt><dd>${typeLabels[d3.record_type] ?? d3.record_type}</dd></div>
        <div><dt>${t5("ui.colInvoiceType")}</dt><dd>${d3.invoice_type}</dd></div>
        <div><dt>${t5("ui.colIssuer")}</dt><dd>${d3.issuer_name} (${d3.issuer_nif})</dd></div>
        <div><dt>${t5("ui.colTotal")}</dt><dd>${erplora5().formatMoney(Number(d3.total_amount))}</dd></div>
        <div><dt>${t5("ui.fieldGeneratedAt")}</dt><dd>${d3.generation_timestamp}</dd></div>
        <div><dt>${t5("ui.fieldTransmittedAt")}</dt><dd>${d3.transmission_timestamp || "\u2014"}</dd></div>
      </dl>
      <section class="fingerprint">
        <h3>${t5("ui.chainSectionTitle")}</h3>
        <dl class="grid">
          <div><dt>${t5("ui.recColHuella")}</dt><dd><code>${_ErpVerifactuRecords.shortHash(d3.record_hash)}</code></dd></div>
          <div><dt>${t5("ui.fieldPreviousHash")}</dt><dd><code>${_ErpVerifactuRecords.shortHash(d3.previous_hash)}</code></dd></div>
        </dl>
      </section>
      <section class="fingerprint">
        <h3>${t5("ui.deliveryFingerprintTitle")}</h3>
        <dl class="grid">
          <div>
            <dt>${t5("ui.fieldTransmissionId")}</dt>
            <dd data-test="fingerprint">${d3.transmission_id ? b2`<code>${d3.transmission_id}</code>` : t5("ui.fingerprintNotStamped")}</dd>
          </div>
          <div>
            <dt>${t5("ui.fieldXmlSha256")}</dt>
            <dd data-test="fingerprint">${d3.xml_sha256 ? b2`<code>${d3.xml_sha256}</code>` : t5("ui.fingerprintNotStamped")}</dd>
          </div>
          <div><dt>${t5("ui.fieldXmlStoragePath")}</dt><dd>${d3.xml_storage_path || "\u2014"}</dd></div>
        </dl>
      </section>
      <section class="fingerprint">
        <h3>${t5("ui.aeatSectionTitle")}</h3>
        <dl class="grid">
          <div><dt>${t5("ui.recColCsv")}</dt><dd>${d3.aeat_csv || "\u2014"}</dd></div>
          <div><dt>${t5("ui.fieldAeatResponseCode")}</dt><dd>${d3.aeat_response_code || "\u2014"}</dd></div>
          <div><dt>${t5("ui.fieldAeatResponseMessage")}</dt><dd>${d3.aeat_response_message || "\u2014"}</dd></div>
          <div><dt>${t5("ui.fieldRetryCount")}</dt><dd>${d3.retry_count}</dd></div>
          <div><dt>${t5("ui.fieldNextRetryAt")}</dt><dd>${d3.next_retry_at || "\u2014"}</dd></div>
          ${d3.qr_url ? b2`<div><dt>${t5("ui.fieldQrUrl")}</dt><dd><a href=${d3.qr_url} target="_blank" rel="noopener">${t5("ui.fieldQrUrlLink")}</a></dd></div>` : A}
        </dl>
      </section>
    </div>`;
  }
  render() {
    if (this.detail) return this.renderDetail();
    const t5 = (k2, params) => erplora5().t(CATALOG6, k2, params);
    return b2`<div>
        <header>
          <h2>${t5("ui.recordsTitle")}</h2>
        </header>
        ${this.ctrl?.error && !dataTableShowsLoadError() ? b2`<p class="err" data-testid="verifactu-records-load-error">${this.ctrl.error}</p>` : A}
        ${this.detailError ? b2`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.detailError}</ok-inline-feedback>` : A}
        ${this.detailLoading ? b2`<ok-inline-feedback data-test="detail-loading" tone="neutral" icon="hourglass-outline">${t5("ui.loading")}</ok-inline-feedback>` : A}
        <!-- verifactu#59: an empty chain over a hub that HAS invoiced is an incident — an
             ungranted certificate capability, or a listener that died (hub#1119 / ADR-0399).
             The plain empty state reassures exactly when it should alarm, so the two are told
             apart here and each one points at where the cause lives.
             (No backticks in here: inside a lit template literal they close the template.) -->
        ${this.chainNotSealing ? b2`<ok-inline-feedback
              tone="danger"
              icon="alert-circle-outline"
              heading=${t5("ui.recordsNotSealingTitle")}
            >
              ${t5("ui.recordsNotSealing", { count: this.invoiceTotal })}
              <div slot="actions">
                <ion-button size="small" fill="outline" @click=${() => this.go("/settings#permissions")}>
                  ${t5("ui.recordsNotSealingGrant")}
                </ion-button>
                <ion-button size="small" fill="outline" @click=${() => this.go("/system#events")}>
                  ${t5("ui.recordsNotSealingEvents")}
                </ion-button>
              </div>
            </ok-inline-feedback>` : A}
        ${this.invoiceCountFailed && (this.ctrl?.total ?? 0) === 0 ? b2`<ok-inline-feedback tone="warning" icon="help-circle-outline">
              ${t5("ui.recordsSealingUnknown")}
            </ok-inline-feedback>` : A}
        <!-- rowClickable opens the detail verifactu#86 adds: record.get had no screen behind it. -->
        <ok-data-table testid="verifactu-records-table" .error=${this.ctrl?.error ?? ""} @retry=${() => Promise.all([this.ctrl?.load(), this.loadInvoiceTotal()])} .serverSide=${true} .views=${true} .rowClickable=${true} .cardTitle=${(row) => String(row.invoice_number ?? row.sequence_number ?? "")} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? "asc"} .searchable=${true} .searchPlaceholder=${t5("ui.recordsSearchPlaceholder")} .emptyMessage=${this.emptyMessage(t5)} @rowClick=${(e6) => this.openDetail(String(e6.detail.row.id))} @pageChange=${(e6) => this.ctrl.setPage(e6.detail)} @sortChange=${(e6) => this.ctrl.setSort(e6.detail.sort, e6.detail.dir)} @searchChange=${(e6) => this.ctrl.setSearch(e6.detail)} @filterChange=${(e6) => this.onFilterChange(e6.detail.col, e6.detail.value)}></ok-data-table>
      </div>`;
  }
};
__decorateClass([
  r5()
], _ErpVerifactuRecords.prototype, "tick", 2);
__decorateClass([
  r5()
], _ErpVerifactuRecords.prototype, "invoiceTotal", 2);
__decorateClass([
  r5()
], _ErpVerifactuRecords.prototype, "invoiceCountFailed", 2);
__decorateClass([
  r5()
], _ErpVerifactuRecords.prototype, "waiting", 2);
__decorateClass([
  r5()
], _ErpVerifactuRecords.prototype, "detail", 2);
__decorateClass([
  r5()
], _ErpVerifactuRecords.prototype, "detailError", 2);
__decorateClass([
  r5()
], _ErpVerifactuRecords.prototype, "detailLoading", 2);
var ErpVerifactuRecords = _ErpVerifactuRecords;
define("erp-verifactu-records", ErpVerifactuRecords);

// ui/components/erp-verifactu-recovery/erp-verifactu-recovery.ts
var CATALOG7 = { es: es_default, en: en_default };
function erplora6() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var HEX64 = /^[0-9a-fA-F]{64}$/;
var ErpVerifactuRecovery = class extends i3 {
  constructor() {
    super(...arguments);
    this.nif = "";
    this.status = null;
    this.manualHash = "";
    this.manualInvoice = "";
    this.manualDate = "";
    this.busy = "";
    this.error = "";
    this.done = "";
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:block; height:100%; overflow:auto; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    h2 { font-size:1.1rem; margin:0 0 .75rem; }
    h3 { font-size:.95rem; margin:1.4rem 0 .55rem; color: var(--ion-text-color, #1c1b18); }
    .card { background: var(--ion-card-background, #fff); border:1px solid var(--ion-border-color, #e6e2d8); border-radius: var(--ok-radius, 12px); overflow:hidden; max-width:40rem; }
    .toolbar { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; margin:.5rem 0; }
    .actions { display:flex; justify-content:flex-end; margin:.85rem 0; max-width:40rem; }
    .toolbar ion-button, .actions ion-button { min-height:44px; margin:.15rem 0; }
    ion-item { --min-height:52px; }
    ion-input { min-height:44px; }
    ok-inline-feedback { display:block; margin-bottom:.5rem; max-width:40rem; }
    .scope { margin:-.25rem 0 .5rem; max-width:40rem; font-size:.8rem; line-height:1.4; color: var(--ion-color-medium, #6b6459); }
  `;
  }
  get columns() {
    const t5 = (k2) => erplora6().t(CATALOG7, k2);
    return [
      { key: "invoice_number", header: t5("ui.colInvoice"), sortable: true, filterable: true, filterType: "text" },
      // A from/to, like the sibling Records table over the same column (verifactu#68). Both hold
      // date-only `YYYY-MM-DD` TEXT, so the range is exact at both ends; the manifest has to
      // declare `op: "range"` to match, or the bounds this control sends arrive unknown.
      { key: "invoice_date", header: t5("ui.colDate"), sortable: true, filterable: true, filterType: "daterange" },
      {
        key: "record_hash",
        header: t5("ui.recColHuella"),
        sortable: true,
        format: (r6) => r6.record_hash ? `${String(r6.record_hash).slice(0, 16)}\u2026` : ""
      },
      { key: "estado", header: t5("ui.recColEstado"), sortable: true, filterable: true, filterType: "text" },
      { key: "aeat_csv", header: t5("ui.recColCsv"), sortable: true },
      { key: "query_timestamp", header: t5("ui.colWhen"), sortable: true }
    ];
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    this.ctrl = createListController(erplora6(), "verifactu.aeat.records.list", () => this.requestUpdate(), {
      pageSize: 50,
      sort: "query_timestamp",
      dir: "desc"
    });
    await this.loadMeta();
    await this.ctrl.load();
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
  }
  /** NIF por defecto (config) + último estado de validación de la cadena. */
  async loadMeta() {
    this.error = "";
    try {
      const cfgRows = await erplora6().query("verifactu.config.get");
      const cfg = Array.isArray(cfgRows) ? cfgRows[0] : cfgRows;
      const nif = cfg?.issuer_nif || cfg?.software_nif;
      if (nif && !this.nif) this.nif = nif;
      const st = await erplora6().query("verifactu.chain.status");
      this.status = Array.isArray(st) ? st[0] ?? null : st ?? null;
    } catch (e6) {
      this.error = e6 instanceof Error ? e6.message : "";
    }
  }
  async run(action, fn, errKey) {
    this.busy = action;
    this.error = "";
    this.done = "";
    try {
      await fn();
      this.done = erplora6().t(CATALOG7, "ui.recDone");
      await this.loadMeta();
      await this.ctrl.load();
    } catch (e6) {
      this.error = e6 instanceof Error ? e6.message : erplora6().t(CATALOG7, errKey);
    } finally {
      this.busy = "";
    }
  }
  validate() {
    return this.run("validate", () => erplora6().command("verifactu.chain.validate", { issuer_nif: this.nif }), "ui.recErrValidate");
  }
  consult() {
    return this.run("consult", () => erplora6().command("verifactu.aeat.query_recent", { issuer_nif: this.nif }), "ui.recErrConsult");
  }
  recoverAeat() {
    return this.run("recoverAeat", () => erplora6().command("verifactu.recovery.from_aeat", { issuer_nif: this.nif }), "ui.recErrRecover");
  }
  recoverManual() {
    const hash = this.manualHash.trim();
    if (!HEX64.test(hash)) {
      this.error = erplora6().t(CATALOG7, "ui.recErrHash");
      return void 0;
    }
    return this.run("recoverManual", () => erplora6().command("verifactu.recovery.manual", {
      issuer_nif: this.nif,
      record_hash: hash,
      invoice_number: this.manualInvoice || "",
      invoice_date: this.manualDate || ""
    }), "ui.recErrRecover");
  }
  requestRecovery(kind) {
    if (kind === "manual" && !HEX64.test(this.manualHash.trim())) {
      this.error = erplora6().t(CATALOG7, "ui.recErrHash");
      return;
    }
    this.error = "";
    void this.confirmRecovery(kind);
  }
  /**
   * verifactu#112 — the confirmation is a DOCUMENT-level overlay, never an alert element declared in
   * this template. Declared inside the shadow root it painted only the backdrop (Ionic styles `ion-alert`
   * from the document): the screen went black and the chain could never be recovered. Same shape as
   * `sales` asking to void a sale; `ui/guards/ion-alert-not-in-shadow-root.test.ts` keeps it so.
   */
  async confirmRecovery(kind) {
    const t5 = (k2) => erplora6().t(CATALOG7, k2);
    const alert = document.createElement("ion-alert");
    alert.header = kind === "manual" ? t5("ui.recConfirmManualTitle") : t5("ui.recConfirmAeatTitle");
    alert.message = kind === "manual" ? t5("ui.recConfirmManualMessage") : t5("ui.recConfirmAeatMessage");
    alert.buttons = [
      { text: t5("ui.recCancel"), role: "cancel" },
      { text: t5("ui.recConfirmAction"), role: "confirm", cssClass: "alert-button-warning" }
    ];
    alert.addEventListener(
      "ionAlertDidDismiss",
      (ev) => {
        setTimeout(() => alert.remove(), 0);
        void this.onRecoveryDismiss(kind, ev);
      },
      { once: true }
    );
    document.body.appendChild(alert);
    try {
      if (typeof alert.present === "function") await alert.present();
      else alert.isOpen = true;
    } catch {
      alert.remove();
    }
  }
  async onRecoveryDismiss(kind, ev) {
    if (ev.detail?.role !== "confirm") return;
    if (kind === "aeat") await this.recoverAeat();
    else await this.recoverManual();
  }
  statusTone() {
    if (!this.status?.event_type) return "neutral";
    return this.status.event_type === "chain_validated" ? "success" : "danger";
  }
  statusLabel(t5) {
    if (!this.status?.event_type) return t5("ui.recChainUnknown");
    return this.status.event_type === "chain_validated" ? t5("ui.recChainValid") : t5("ui.recChainBroken");
  }
  render() {
    const t5 = (k2) => erplora6().t(CATALOG7, k2);
    const blocked = this.busy !== "" || !this.nif;
    return b2`
      <h2>${t5("ui.recoveryTitle")}</h2>
      ${this.error ? b2`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : A}
      ${this.done ? b2`<ok-inline-feedback tone="success" icon="checkmark-circle-outline">${this.done}</ok-inline-feedback>` : A}

      <div class="card">
        <ion-list>
          <ion-item lines="none">
            <ion-input label=${t5("ui.recManualNif")} label-placement="stacked" .value=${this.nif} placeholder="B12345678" @ionInput=${(e6) => {
      this.nif = e6.target.value;
    }}></ion-input>
          </ion-item>
        </ion-list>
      </div>

      <h3>${t5("ui.recChainStatus")}</h3>
      <ok-inline-feedback tone=${this.statusTone()} heading=${this.statusLabel(t5)} icon="shield-checkmark-outline">${this.status?.message ?? ""}</ok-inline-feedback>
      <!-- verifactu#53: the verdict is about the HASH CHAIN, not about the amounts. A QA report
           quoted «Cadena íntegra: 27 registro(s) verificados» as proof that records declaring an
           impossible quota were fine. The check has to say what it covers. -->
      <p class="scope">${t5("ui.recChainScope")}</p>
      <div class="toolbar">
        <ion-button size="small" ?disabled=${blocked} @click=${() => this.validate()}>${this.busy === "validate" ? t5("ui.recValidating") : t5("ui.recValidate")}</ion-button>
        <ion-button size="small" fill="outline" ?disabled=${blocked} @click=${() => this.consult()}>${this.busy === "consult" ? t5("ui.recConsulting") : t5("ui.recConsultAeat")}</ion-button>
        <ion-button fill="outline" color="warning" ?disabled=${blocked} @click=${() => this.requestRecovery("aeat")}>${this.busy === "recoverAeat" ? t5("ui.recRecovering") : t5("ui.recRecoverFromAeat")}</ion-button>
      </div>

      <h3>${t5("ui.recAeatTitle")}</h3>
      ${this.ctrl?.error && !dataTableShowsLoadError() ? b2`<ok-inline-feedback data-testid="verifactu-recovery-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : A}
      <ok-data-table
        testid="verifactu-recovery-table"
        .error=${this.ctrl?.error ?? ""}
        @retry=${() => Promise.all([this.ctrl?.load(), this.loadMeta()])}
        .serverSide=${true}
        .views=${true}
        .cardTitle=${(row) => String(row.invoice_number ?? row.record_hash ?? "")}
        .columns=${this.columns}
        .rows=${this.ctrl?.rows ?? []}
        .total=${this.ctrl?.total ?? 0}
        .page=${this.ctrl?.state.page ?? 0}
        .pageSize=${this.ctrl?.state.pageSize ?? 50}
        .sort=${this.ctrl?.state.sort}
        .sortDir=${this.ctrl?.state.dir ?? "desc"}
        .searchable=${true}
        .emptyMessage=${this.ctrl?.loading ? t5("ui.loading") : t5("ui.recAeatEmpty")}
        @pageChange=${(e6) => this.ctrl.setPage(e6.detail)}
        @sortChange=${(e6) => this.ctrl.setSort(e6.detail.sort, e6.detail.dir)}
        @searchChange=${(e6) => this.ctrl.setSearch(e6.detail)}
        @filterChange=${(e6) => this.ctrl.setFilter(e6.detail.col, e6.detail.value)}
      ></ok-data-table>

      <h3>${t5("ui.recManualTitle")}</h3>
      <ok-inline-feedback tone="info" icon="information-circle-outline">${t5("ui.recManualHint")}</ok-inline-feedback>
      <div class="card">
        <ion-list>
          <ion-item>
            <ion-input label=${t5("ui.recManualHash")} label-placement="stacked" .value=${this.manualHash} placeholder="A1B2…(64)" @ionInput=${(e6) => {
      this.manualHash = e6.target.value;
    }}></ion-input>
          </ion-item>
          <ion-item>
            <ion-input label=${t5("ui.recManualInvoice")} label-placement="stacked" .value=${this.manualInvoice} placeholder="2024/001" @ionInput=${(e6) => {
      this.manualInvoice = e6.target.value;
    }}></ion-input>
          </ion-item>
          <ion-item lines="none">
            <ion-input label=${t5("ui.recManualDate")} label-placement="stacked" .value=${this.manualDate} placeholder="2024-12-31" @ionInput=${(e6) => {
      this.manualDate = e6.target.value;
    }}></ion-input>
          </ion-item>
        </ion-list>
      </div>
      <div class="actions">
        <ion-button color="warning" ?disabled=${blocked} @click=${() => this.requestRecovery("manual")}>${this.busy === "recoverManual" ? t5("ui.recRecovering") : t5("ui.recRecoverManual")}</ion-button>
      </div>
    `;
  }
};
__decorateClass([
  r5()
], ErpVerifactuRecovery.prototype, "nif", 2);
__decorateClass([
  r5()
], ErpVerifactuRecovery.prototype, "status", 2);
__decorateClass([
  r5()
], ErpVerifactuRecovery.prototype, "manualHash", 2);
__decorateClass([
  r5()
], ErpVerifactuRecovery.prototype, "manualInvoice", 2);
__decorateClass([
  r5()
], ErpVerifactuRecovery.prototype, "manualDate", 2);
__decorateClass([
  r5()
], ErpVerifactuRecovery.prototype, "busy", 2);
__decorateClass([
  r5()
], ErpVerifactuRecovery.prototype, "error", 2);
__decorateClass([
  r5()
], ErpVerifactuRecovery.prototype, "done", 2);
define("erp-verifactu-recovery", ErpVerifactuRecovery);

// ui/lib/quantity.ts
var QUANTITY_SCALE2 = 1e6;
function toMicro2(qty) {
  return Math.round(qty * QUANTITY_SCALE2);
}

// ui/lib/responsible-declaration.ts
var DECLARATION_PATH = "/api/system/declaration";
var DECLARATION_FIELDS = [
  "NombreRazon",
  "NIF",
  "NombreSistemaInformatico",
  "IdSistemaInformatico",
  "Version",
  "NumeroInstalacion",
  "TipoUsoPosibleSoloVerifactu",
  "TipoUsoPosibleMultiOT",
  "IndicadorMultiplesOT"
];
var str2 = (v3) => typeof v3 === "string" ? v3 : "";
async function fetchResponsibleDeclaration() {
  const reply = await coreFetch(DECLARATION_PATH);
  const payload = reply.body;
  if (!reply.ok || typeof payload.declarationUrl !== "string") {
    throw new Error(`GET ${DECLARATION_PATH} \u2192 HTTP ${reply.status}`);
  }
  const block = payload.sistemaInformatico;
  const complete = !!block && typeof block === "object" && DECLARATION_FIELDS.every((field) => str2(block[field]).length > 0);
  const declarationVersion = str2(payload.declarationVersion).trim();
  return {
    version: str2(payload.version),
    numeroInstalacion: str2(payload.numeroInstalacion),
    declarationUrl: payload.declarationUrl,
    ...declarationVersion ? { declarationVersion } : {},
    sistemaInformatico: complete ? Object.fromEntries(
      DECLARATION_FIELDS.map((field) => [field, str2(block[field])])
    ) : null
  };
}

// ui/components/erp-verifactu-settings/erp-verifactu-settings.ts
var CATALOG8 = { es: es_default, en: en_default };
function erplora7() {
  const c5 = globalThis.erplora;
  if (!c5) throw new Error("erplora SDK no inicializado por el shell");
  return c5;
}
var DEMO_LOCKS = {
  demo_fiscal_environment_locked: "ui.errDemoEnvironmentLocked",
  demo_business_certificate_locked: "ui.errDemoCertificateLocked",
  demo_fiscal_identity_locked: "ui.errDemoIdentityLocked"
};
var CAPABILITY_DENIED = "capability_denied";
var ROUTE_OWN2 = "own";
var ROUTE_DELEGATED = "delegated";
function refusalKey2(e6) {
  const code = typeof e6?.code === "string" ? e6.code : "";
  const message = e6 instanceof Error ? e6.message : "";
  if (DEMO_LOCKS[code]) return DEMO_LOCKS[code];
  const lockInText = Object.keys(DEMO_LOCKS).find((c5) => message.includes(c5));
  if (lockInText) return DEMO_LOCKS[lockInText];
  if (code === CAPABILITY_DENIED || message.includes(CAPABILITY_DENIED)) return "ui.errCapabilityDenied";
  if (message.includes("config_save_requires_issuer")) return "ui.errIssuerRequired";
  if (message.includes("config_save_go_live_is_one_way")) return "ui.errGoLiveIsOneWay";
  if (message.includes("verifactu__gate")) return "ui.errGoLiveIsOneWay";
  return "";
}
var GREEN = "--track-background-checked: rgba(var(--ion-color-success-rgb, 45,211,111), 0.5); --handle-background-checked: var(--ion-color-success, #2dd36f);";
var PRODUCER = {
  // IdSistemaInformatico: la AEAT lo limita a 2 caracteres (validación del XSD VeriFactu).
  software_id: "EC",
  software_version: "1.0.0",
  software_nif: "B27593136",
  software_name: "ERPLORA CLOUD SL"
};
var CERTIFICATE_PATH2 = "/api/business/certificate";
function routeRefusalKey(body) {
  const error = body?.error;
  const code = typeof error === "string" ? error : error?.code ?? "";
  if (code === "fiscal.no_representation_grant") return "ui.errRouteNeedsGrant";
  if (code === "fiscal.gateway_not_enrolled") return "ui.errRouteNeedsConnection";
  if (code === "fiscal.own_certificate_not_uploaded") return "ui.errRouteNeedsCertificate";
  return "ui.errRouteSwitch";
}
var GO_LIVE_PATH = "/api/fiscal/go-live";
function goLiveRefusalKey(body) {
  const error = body?.error;
  const code = typeof error === "string" ? error : error?.code ?? "";
  const keys = {
    "fiscal.no_representation_grant": "ui.errGoLiveNeedsGrant",
    "fiscal.not_ready": "ui.errGoLiveNotReady",
    "fiscal.go_live_forbidden": "ui.errGoLiveDemo",
    "fiscal.own_certificate_expired": "ui.errGoLiveCertificateExpired",
    "fiscal.hub_closed": "ui.errGoLiveClosed",
    "fiscal.already_emitted": "ui.errGoLiveIsOneWay",
    [CAPABILITY_DENIED]: "ui.errCapabilityDenied"
  };
  return keys[code] ?? "ui.errGoLive";
}
function goLiveStateUnavailableKey(body) {
  const key = goLiveRefusalKey(body);
  return key === "ui.errCapabilityDenied" ? key : "ui.errGoLiveStateUnavailable";
}
var ErpVerifactuSettings = class extends i3 {
  constructor() {
    super(...arguments);
    this.cfg = {};
    this.loading = true;
    this.saving = false;
    this.error = "";
    this.saved = false;
    this.diag = null;
    this.testing = false;
    this.testType = "F2";
    this.showProducer = false;
    this.declaration = null;
    this.declarationError = false;
    this.creatingInvoice = false;
    this.invoiceCreated = false;
    this.capabilityDenied = false;
    this.savedEnabled = false;
    this.transmission = null;
    this.routeLoading = true;
    this.certificateStatus = null;
    this.switchingRoute = false;
    this.routeNotice = null;
    this.gateway = null;
    this.gatewayLoading = true;
    this.goLive = null;
    this.goLiveAbsent = false;
    this.goLiveUnavailable = null;
    this.switchingEnvironment = false;
    this.goLiveNotice = null;
    this.onLocaleChange = () => this.requestUpdate();
  }
  static {
    this.styles = i`
    :host { display:block; height:100%; overflow:auto; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    h2 { font-size:1.1rem; margin:0 0 .75rem; }
    h3 { font-size:1rem; margin:0 0 .35rem; }
    .cols { display:grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap:1rem; align-items:start; }
    @media (max-width: 980px) { .cols { grid-template-columns:1fr; } }
    .card { background: var(--ion-card-background, #fff); border:1px solid var(--ion-border-color, #e6e2d8); border-radius: var(--ok-radius, 12px); overflow:hidden; }
    .card-actions { display:flex; justify-content:flex-end; padding:.75rem 1rem; }
    .test-body { display:flex; flex-direction:column; gap:.7rem; padding:1rem 1.1rem 1.2rem; }
    .test-actions { display:flex; gap:.5rem; flex-wrap:wrap; }
    .cert { display:flex; flex-direction:column; gap:.4rem; width:100%; padding:.25rem 0; }
    .cert-head { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; }
    .cert-head ion-label { margin:0; }
    .hint { font-size:.78rem; color: var(--ion-color-medium, #6b7280); margin:0; }
    .kv { display:flex; flex-direction:column; gap:.15rem; }
    .kv .k { font-size:.75rem; color: var(--ion-color-medium, #6b7280); }
    .kv code { font-family: ui-monospace, monospace; font-size:.8rem; word-break:break-all; }
    .link { color: var(--ion-color-primary, #3880ff); font-weight:600; text-decoration:none; }
    .prod { display:flex; flex-direction:column; gap:.5rem; width:100%; padding:.25rem 0; }
    .prod-head { display:flex; gap:.35rem; align-items:center; }
    .prod-head .t { font-size:.9rem; }
    .prod-head ion-button { --padding-start:.35rem; --padding-end:.35rem; --color: var(--ion-color-primary, #3880ff); margin:0; min-width:44px; min-height:44px; font-size:1.25rem; font-weight:700; }
    .card-actions ion-button, .test-actions ion-button, .cert ion-button { min-height:44px; }
    ion-item { --min-height:52px; }
    ion-input, ion-select { min-height:44px; }
    .info { display:flex; flex-direction:column; gap:.45rem; padding:.5rem .75rem; border-radius: var(--ok-radius-sm, 8px); background: var(--ion-color-light, #f4f5f8); }
    ok-inline-feedback { display:block; }
    .decl h4 { margin:.9rem 0 .3rem; font-size:.9rem; }
    .decl-ref { display:flex; flex-wrap:wrap; gap:.5rem; align-items:baseline; margin:.4rem 0 0; }
    .decl-field { padding:.45rem 0; border-bottom:1px solid var(--ion-border-color, #e6e2d8); }
    .decl-field:last-child { border-bottom:none; }
    .decl-value { margin:.1rem 0 0; font-weight:600; word-break:break-all; }
    .decl-element { margin:.05rem 0 0; font-size:.72rem; color: var(--ion-color-medium, #6b7280); font-family: ui-monospace, monospace; }
  `;
  }
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener("erplora:locale-changed", this.onLocaleChange);
    await this.refresh();
    void this.loadGoLive();
    await this.loadRoute();
    if (this.usesGatewayIdentity) await this.loadGatewayIdentity();
    else this.gatewayLoading = false;
    await this.loadDiag();
    await this.loadDeclaration();
  }
  disconnectedCallback() {
    window.removeEventListener("erplora:locale-changed", this.onLocaleChange);
    super.disconnectedCallback();
  }
  async refresh() {
    this.loading = true;
    this.error = "";
    try {
      const rows = await erplora7().query("verifactu.config.get");
      const c5 = Array.isArray(rows) ? rows[0] : rows;
      this.cfg = c5 ?? {};
    } catch (e6) {
      this.error = e6 instanceof Error ? e6.message : erplora7().t(CATALOG8, "ui.errLoadConfig");
    } finally {
      this.loading = false;
    }
  }
  /**
   * Reads the road this hub is on from the CORE (hub#1416, `contracts/kernel/engine.snapshot`).
   *
   * A refusal is swallowed into `transmission = null` and NOT into `this.error`: that slot is the
   * screen-wide one, and a fact this screen merely REFLECTS must not blank out the configuration
   * the owner came here to change. The route block states «not available» in its own place, which
   * is where a person can act on it.
   */
  async loadRoute() {
    void this.loadCertificateStatus();
    await this.loadTransmission();
  }
  /** The road, from the core (`hub.fiscal.transmission`). `routeLoading` runs on this clock alone. */
  async loadTransmission() {
    this.routeLoading = true;
    try {
      const rows = await erplora7().query("hub.fiscal.transmission");
      const row = Array.isArray(rows) ? rows[0] : rows;
      this.transmission = row ?? null;
    } catch {
      this.transmission = null;
    } finally {
      this.routeLoading = false;
    }
  }
  /**
   * Where this hub files, from the core (hub#2079). Only a 404 means «no door»; any other failure
   * is the door refusing or unreachable, and says why (verifactu#125).
   */
  async loadGoLive() {
    const reply = await coreFetch(GO_LIVE_PATH);
    const envelope = reply.body;
    this.goLive = reply.ok ? envelope?.data ?? null : null;
    this.goLiveAbsent = reply.status === 404;
    this.goLiveUnavailable = reply.ok || reply.status === 404 ? null : goLiveStateUnavailableKey(reply.body);
  }
  /** Reads the door again after it failed to answer; the button stays off while it does. */
  async retryGoLive() {
    this.switchingEnvironment = true;
    try {
      await this.loadGoLive();
    } finally {
      this.switchingEnvironment = false;
    }
  }
  /**
   * **The environment this hub files in** — the core's word when it gave one, the module row only
   * on a runtime that predates the go-live door. One getter for every reader (the save, the test
   * invoice, the block), so the screen cannot say two things.
   */
  get environment() {
    return (this.goLive?.environment || this.cfg.environment || "testing").trim();
  }
  /**
   * Asks for confirmation, then goes live (`POST`) or back to testing (`DELETE`) through the core.
   * The confirmation is a DOCUMENT-level alert, the same shape as the chain recovery
   * (verifactu#112): declared in this shadow root it would paint only the backdrop.
   */
  async confirmEnvironment(live) {
    const t5 = (k2) => erplora7().t(CATALOG8, k2);
    const alert = document.createElement("ion-alert");
    alert.header = t5(live ? "ui.goLiveConfirmTitle" : "ui.standDownConfirmTitle");
    alert.message = t5(live ? "ui.goLiveConfirmMessage" : "ui.standDownConfirmMessage");
    alert.buttons = [
      { text: t5("ui.recCancel"), role: "cancel" },
      { text: t5(live ? "ui.goLiveAction" : "ui.standDownAction"), role: "confirm", cssClass: "alert-button-warning" }
    ];
    alert.addEventListener(
      "ionAlertDidDismiss",
      (ev) => {
        setTimeout(() => alert.remove(), 0);
        if (ev.detail?.role === "confirm") void this.switchEnvironment(live);
      },
      { once: true }
    );
    document.body.appendChild(alert);
    try {
      if (typeof alert.present === "function") await alert.present();
      else alert.isOpen = true;
    } catch {
      alert.remove();
    }
  }
  /** The core decides; the environment is READ back from its answer, never assumed. */
  async switchEnvironment(live) {
    this.switchingEnvironment = true;
    this.goLiveNotice = null;
    try {
      const reply = await coreFetch(GO_LIVE_PATH, { method: live ? "POST" : "DELETE" });
      if (reply.ok) {
        this.goLive = reply.body?.data ?? this.goLive;
        this.goLiveNotice = { key: live ? "ui.goLiveDone" : "ui.standDownDone", tone: "success" };
      } else {
        this.goLiveNotice = { key: goLiveRefusalKey(reply.body), tone: "danger" };
        await this.loadGoLive();
      }
    } finally {
      this.switchingEnvironment = false;
    }
  }
  /** Whether a `.p12` is uploaded and switched on, from the core door. `null` = it did not answer. */
  async loadCertificateStatus() {
    const certificate = await coreFetch(CERTIFICATE_PATH2);
    const envelope = certificate.body;
    this.certificateStatus = certificate.ok ? envelope?.data ?? null : null;
  }
  /**
   * **The «Usar mi propio certificado» switch changes the road** (hub#1871). It used to navigate to
   * Configuración and change nothing: the `.p12` kept filing and the switch came back on.
   *
   * The position the owner asked for is read from the EVENT, never from a getter at the moment it
   * fires — what matters is what they saw and flipped. Three outcomes:
   *  - asking for ON with no certificate uploaded: there is nothing to switch, so the owner goes to
   *    upload one (the old navigation, now only where it is the answer);
   *  - otherwise the core decides (`PATCH /api/business/certificate`), and the road is READ back
   *    from the core, never assumed;
   *  - a refusal is said in the owner's words, and the switch goes back to the real road.
   */
  async onOwnToggle(ev) {
    const target = ev.target;
    const wanted = ev.detail?.checked ?? !!target?.checked;
    if (wanted === this.signsWithOwnCertificate) return;
    if (wanted && this.certificateStatus && !this.certificateStatus.present) {
      if (target) target.checked = this.signsWithOwnCertificate;
      this.goConfig("own");
      return;
    }
    this.switchingRoute = true;
    this.routeNotice = null;
    try {
      const reply = await coreFetch(CERTIFICATE_PATH2, {
        method: "PATCH",
        json: { use_for_transmission: wanted }
      });
      if (reply.ok) {
        this.routeNotice = { key: wanted ? "ui.routeSwitchedOwn" : "ui.routeSwitchedDelegated", tone: "success" };
        await this.loadRoute();
        if (this.usesGatewayIdentity) await this.loadGatewayIdentity();
      } else {
        this.routeNotice = { key: routeRefusalKey(reply.body), tone: "danger" };
      }
    } finally {
      this.switchingRoute = false;
      if (target) target.checked = this.signsWithOwnCertificate;
    }
  }
  /**
   * `own` / `delegated` as the core said it, or `''` when nobody told us. Anything else the wire
   * might carry collapses to `''` on purpose: an unrecognised word is «we do not know», never a
   * road picked by this screen.
   */
  get route() {
    const r6 = (this.transmission?.transmission_route ?? "").trim();
    return r6 === ROUTE_OWN2 || r6 === ROUTE_DELEGATED ? r6 : "";
  }
  /**
   * **Does this hub sign with a certificate of its OWN?** — ONE rule for the two places that ask
   * it (the prerequisite pill and the live-test gate), because two derivations of the same fact
   * is how a screen ends up contradicting itself.
   *
   * With the route known it IS the route: `route_of` answers `own` exactly when the hub holds its
   * own `.p12`. Without it, the old `:has_certificate` reading — correct on any runtime that
   * predates hub#1416, where that param was still `can_sign`, and the honest answer where we were
   * told nothing.
   */
  get signsWithOwnCertificate() {
    return this.route ? this.route === ROUTE_OWN2 : !!this.cfg.has_certificate;
  }
  /**
   * **May this hub run the live test?** — since hub#1485 the answer is «does it have a ROAD», not
   * «does it hold a `.p12`».
   *
   * The engine used to resolve the diagnostic through the core identity, so on the delegated road
   * it always answered «your certificate does not load» to a hub that files perfectly. This screen
   * covered for that by switching the button off and saying the test «needs a certificate of your
   * own». Both halves were the same defect: the business was sent to renew something it has never
   * had. `run_diagnostics` now goes through `resolve_route`, and on the cell it probes readiness
   * instead of filing a sample (ADR-0189 — a filed record cannot be undone), so the test is exactly
   * as available as the road is.
   *
   * The one hub still held back is the one with NO road: no certificate and no enrolment. Its
   * button would reach nothing, and what it needs is the enrolment section above, not a file
   * picker.
   */
  get canRunLiveTest() {
    return this.signsWithOwnCertificate || this.route === ROUTE_DELEGATED && this.cellCanBeReached;
  }
  /**
   * Whether the cell has an identity to present for this hub — false ONLY when the door has
   * positively said there is none.
   *
   * A read still in flight, and a door that could not be read at all (`unknown`), both count as
   * yes. This screen already degrades that way everywhere it touches the same facts — an unreadable
   * `notAfter` is `active` rather than `expired`, the enrolment section hides only when the core has
   * SAID `own` — and for the same reason: taking the test away from a hub over a read that did not
   * land is the shape of the bug this issue is about. The engine re-resolves the road server-side
   * and answers truthfully, so the worst case is an honest «the cell cannot file right now» instead
   * of a button that is dead for no stated reason.
   */
  get cellCanBeReached() {
    return this.gatewayLoading || gatewayState(this.gateway, Date.now()) !== "absent";
  }
  /**
   * **Does the fiscal cell speak for this hub?** — ONE rule for the two places that ask it (the
   * read on open and the section itself), because a screen that fetches what it never paints is
   * how a pointless call to the core survives a review.
   *
   * The machine identity is what the cell presents when it files IN THE NAME of the business
   * (ADR-0320 §1 / ADR-0419); a hub holding its own `.p12` reaches the AEAT by itself and its
   * identity takes part in nothing, so showing it there is technical noise on a business screen.
   *
   * Hidden ONLY when the core has SAID `own`, never «shown only when it said `delegated`»: a
   * runtime that does not publish `hub.fiscal.transmission` can perfectly well be on the cell, and
   * hiding the section from it would take away its only way to enrol (verifactu#82).
   */
  get usesGatewayIdentity() {
    return this.route !== ROUTE_OWN2;
  }
  /**
   * Reads this hub's MACHINE identity from the core route (hub#1457).
   *
   * A failure lands in `gateway = null` and NOT in `this.error`: that slot belongs to the whole
   * screen, and a side read must not blank out the configuration the owner came here to change.
   * The section says «not available» in its own place, where a person can act on it.
   */
  async loadGatewayIdentity() {
    this.gatewayLoading = true;
    const reply = await gatewayFetch(GATEWAY_IDENTITY_PATH, "GET");
    this.gateway = reply.ok ? reply.body : null;
    this.gatewayLoading = false;
  }
  /**
   * Lee la declaracion responsable del core. Un fallo se GUARDA como fallo: la alternativa es
   * una ficha en blanco, que ante una inspeccion se lee como «este sistema no declara nada».
   */
  async loadDeclaration() {
    try {
      this.declaration = await fetchResponsibleDeclaration();
      this.declarationError = false;
    } catch {
      this.declaration = null;
      this.declarationError = true;
    }
  }
  async loadDiag() {
    try {
      const rows = await erplora7().query("verifactu.diagnostics.last");
      const row = Array.isArray(rows) ? rows[0] : rows;
      this.diag = row?.details ? JSON.parse(row.details) : null;
    } catch {
      this.diag = null;
    }
  }
  set(key, value) {
    this.cfg = { ...this.cfg, [key]: value };
    this.saved = false;
  }
  /** Navigates to Settings → **Permissions** (`#permissions`), where the owner grants the module
   *  capabilities (ADR-0079). Same module→shell navigation as {@link goConfig}, and the hash
   *  matters for the same reason (verifactu#49): `/settings` bare degrades to the Hub tab
   *  (`resolveSettingsTab`), so the owner would do as told and land on a screen with nothing to
   *  press. `permissions` is one of the shell's declared tabs — it is not a hash we invented. */
  /**
   * Abre Configuracion en la pestana que toca.
   *
   * `pushState` solo cambia la URL: hay que disparar `popstate` en WINDOW (no en el elemento — un
   * `dispatchEvent` sin target se queda en el shadow root y no llega al router de Vue). Es el mismo
   * patron que {@link goToPermissions}.
   */
  goConfig(tab) {
    window.history.pushState({}, "", `/m/verifactu/config#${tab}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  goToPermissions() {
    window.history.pushState({}, "", "/settings#permissions");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  /** Records what a native command just proved about the capability grant. */
  noteCapability(e6) {
    const code = typeof e6?.code === "string" ? e6.code : "";
    this.capabilityDenied = code === CAPABILITY_DENIED || e6 instanceof Error && e6.message.includes(CAPABILITY_DENIED);
  }
  async save(ev) {
    ev.preventDefault();
    this.saving = true;
    this.error = "";
    this.saved = false;
    this.savedEnabled = false;
    try {
      if (this.cfg.enabled && !(this.cfg.issuer_nif || "").trim()) {
        this.error = erplora7().t(CATALOG8, "ui.errIssuerRequired");
        return;
      }
      await erplora7().command("verifactu.config.save", {
        enabled: !!this.cfg.enabled,
        mode: this.cfg.mode || "verifactu",
        // The core's environment (hub#2079): the row is a mirror now, and saving must not make it
        // disagree with the profile. Only a runtime without the go-live door still reads it.
        environment: this.environment,
        // Identificación del productor: SIEMPRE fija (no editable por el cliente).
        software_name: PRODUCER.software_name,
        software_version: PRODUCER.software_version,
        software_id: PRODUCER.software_id,
        software_nif: PRODUCER.software_nif,
        // Obligado tributario (emisor): NO se manda. Es identidad fiscal del hub (ADR-0061) y la
        // resuelve el propio `config_save.sql` desde `:business_tax_id`/`:business_legal_name`,
        // que es lo que impide que la config del módulo y el hub declaren NIF distintos.
        retry_interval_minutes: Number(this.cfg.retry_interval_minutes) || 5,
        max_retries: Number(this.cfg.max_retries) || 10
      });
      this.saved = true;
      this.savedEnabled = !!this.cfg.enabled;
      await this.refresh();
    } catch (e6) {
      const key = refusalKey2(e6);
      const message = e6 instanceof Error ? e6.message : "";
      this.error = key ? erplora7().t(CATALOG8, key) : message || erplora7().t(CATALOG8, "ui.errSaveConfig");
    } finally {
      this.saving = false;
    }
  }
  async runTest() {
    this.testing = true;
    this.error = "";
    try {
      await erplora7().command("verifactu.diagnostics.run", { invoice_type: this.testType });
      this.capabilityDenied = false;
      await this.loadDiag();
    } catch (e6) {
      this.noteCapability(e6);
      const key = refusalKey2(e6);
      this.error = key ? erplora7().t(CATALOG8, key) : (e6 instanceof Error ? e6.message : "") || erplora7().t(CATALOG8, "ui.errTestRun");
    } finally {
      this.testing = false;
    }
  }
  /**
   * Creates a test invoice (F2 ticket) via the cross-module `invoice.create` command.
   * F2 does NOT need the Recipients block → avoids AEAT error 1189. The Hub always transmits
   * on creation (ADR-0202 R3: active module = always emit), so it sends itself to the AEAT
   * and shows up in /m/invoice.
   * WIRE CONTRACT (verifactu#50): `quantity` is a FIXED-POINT integer of scale 10⁶ (ADR-0147,
   * 1 unit = 1000000) and `unit_price` is integer minor units (ADR-0123, cents). A bare `1`
   * is 0,000001 units: invoice < 1.2.17 issued the ticket for 0.00 €, and since invoice#49
   * the destination rejects it (422 `invalid_payload`, then `line_amount_underflow`). With
   * 1 unit at 100 cents the ticket comes out at base 1.00 € + quota 0.21 € (21 %).
   * GUARD: only in the testing environment and with the issuer tax ID configured.
   */
  async createTestInvoice() {
    this.creatingInvoice = true;
    this.invoiceCreated = false;
    this.error = "";
    try {
      await erplora7().command("invoice.create", {
        series_code: "TICKET",
        invoice_type: "F2",
        source_type: "test",
        notes: "Prueba VeriFactu",
        items: [{ description: "Factura de PRUEBA VeriFactu (entorno de pruebas)", quantity: toMicro2(1), unit_price: 100, tax_rate: 21, product_id: null }]
      });
      this.invoiceCreated = true;
    } catch (e6) {
      const key = refusalKey2(e6);
      this.error = key ? erplora7().t(CATALOG8, key) : (e6 instanceof Error ? e6.message : "") || erplora7().t(CATALOG8, "ui.errTestInvoice");
    } finally {
      this.creatingInvoice = false;
    }
  }
  /**
   * What the fiscal CELL said about itself when the diagnostic probed it (hub#1485) — present only
   * on the delegated road, absent on every run from before it.
   *
   * This is the block that replaces the AEAT verdict on that road: the test deliberately does not
   * file (ADR-0189), so «can ERPlora file for you right now» is the whole answer, and the cell's
   * own `reason` is the only actionable thing in it.
   */
  renderTestGateway(t5) {
    const g3 = this.diag?.gateway;
    if (!g3) return A;
    if (g3.error) {
      return b2`<ok-inline-feedback tone="danger" heading=${t5("ui.testGatewayNotReady")} icon="alert-circle-outline">${g3.error}</ok-inline-feedback>`;
    }
    const detail = [g3.status, g3.reason].filter(Boolean).join(" \xB7 ");
    return b2`<ok-inline-feedback
      tone=${g3.ok ? "success" : "danger"}
      heading=${t5(g3.ok ? "ui.testGatewayReady" : "ui.testGatewayNotReady")}
      icon=${g3.ok ? "checkmark-circle-outline" : "alert-circle-outline"}
    >${detail}</ok-inline-feedback>`;
  }
  renderAeat(t5) {
    const a3 = this.diag?.aeat;
    if (!a3) {
      const filedByErplora = (this.diag?.route ?? this.route) === ROUTE_DELEGATED;
      return b2`<ok-inline-feedback tone="neutral" icon="information-circle-outline">${t5(filedByErplora ? "ui.testAeatNotSentDelegated" : "ui.testAeatNotSent")}</ok-inline-feedback>`;
    }
    if (a3.error) {
      const why = reasonSentence(CATALOG8, erplora7().locale, (catalog, key, params) => erplora7().t(catalog, key, params), a3.reason, (minor) => erplora7().formatMoney(minor));
      return b2`<ok-inline-feedback tone="danger" heading=${t5("ui.testAeatError")} icon="alert-circle-outline">${why ?? a3.error}${a3.detail ? b2`<p class="hint">${a3.detail}</p>` : A}</ok-inline-feedback>`;
    }
    if (a3.ok) {
      const csv = a3.csv ? ` \xB7 CSV ${a3.csv}` : "";
      return b2`<ok-inline-feedback tone="success" heading=${t5("ui.testAeatAccepted")} icon="checkmark-circle-outline">${a3.estado_registro || a3.estado_envio || ""}${csv}</ok-inline-feedback>`;
    }
    return b2`<ok-inline-feedback tone="danger" heading=${a3.estado_registro || a3.estado_envio || "\u2014"} icon="alert-circle-outline">${[a3.codigo_error, a3.descripcion_error].filter(Boolean).join(": ")}</ok-inline-feedback>`;
  }
  /**
   * La ficha que se le ensena a una inspeccion (art. 13.2 RRSIF).
   *
   * Rotulo -> VALOR -> nombre del elemento, apilados en una columna. El valor NO va a la derecha:
   * el mas largo es un UUID de 36 caracteres y a 390 px se montaba encima del nombre del elemento,
   * que tambien parte. Apilado se lee igual en los tres anchos y el valor queda entero.
   *
   * El nombre del elemento va en su grafia LITERAL (`NombreRazon`, `IdSistemaInformatico`): es lo
   * que pide una inspeccion y lo que lleva el XML, asi que no se traduce.
   */
  renderDeclaration(t5) {
    const d3 = this.declaration;
    return b2`<div class="card decl">
      <div class="card-body">
        <h3>${t5("ui.declTitle")}</h3>
        <p class="hint">${t5("ui.declDesc")}</p>
        ${this.declarationError ? b2`<ok-inline-feedback
              data-testid="declaration-error"
              tone="danger"
              icon="alert-circle-outline"
            >${t5("ui.declError")}</ok-inline-feedback>` : A}
        ${d3 ? b2`
              <p class="decl-ref">
                <a
                  class="link"
                  data-testid="declaration-link"
                  href=${d3.declarationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >${t5("ui.declRead")}</a>
                ${d3.declarationVersion ? b2`<span class="k">${t5("ui.declTextVersion")} <strong>${d3.declarationVersion}</strong></span>` : A}
              </p>
              <h4>${t5("ui.declDataTitle")}</h4>
              ${!d3.sistemaInformatico ? b2`<ok-inline-feedback
                    data-testid="declaration-pending"
                    tone="warning"
                    icon="information-circle-outline"
                  >${t5("ui.declPending")}</ok-inline-feedback>` : A}
              ${this.declarationRows(d3, t5).map(
      (row) => b2`<div class="decl-field">
                  <span class="k">${row.label}</span>
                  <p class="decl-value">${row.value}</p>
                  <p class="decl-element">${row.field}</p>
                </div>`
    )}
            ` : A}
      </div>
    </div>`;
  }
  /**
   * Las filas de la ficha. Con el bloque del fabricante van los nueve elementos; sin el, van los
   * dos que este hub sabe de si mismo — la version del binario y su numero de instalacion —, que
   * es informacion cierta y util aunque falte la otra mitad.
   */
  declarationRows(d3, t5) {
    const block = d3.sistemaInformatico;
    const own = { Version: d3.version, NumeroInstalacion: d3.numeroInstalacion };
    const fields = block ? DECLARATION_FIELDS : ["Version", "NumeroInstalacion"];
    return fields.map((field) => ({
      field,
      label: t5(`ui.decl${field}`),
      value: block ? block[field] : own[field] ?? ""
    }));
  }
  renderTestCard(t5) {
    const d3 = this.diag;
    const isTesting = this.environment === "testing";
    const hasIssuer = !!(this.cfg.issuer_nif || "").trim();
    const canCreateInvoice = isTesting && hasIssuer;
    return b2`<div class="card">
      <div class="test-body">
        <h3>${t5("ui.testTitle")}</h3>
        <p class="hint">${t5("ui.testHint")}</p>
        <ion-item lines="none">
          <ion-select label=${t5("ui.testType")} label-placement="stacked" .value=${this.testType} @ionChange=${(e6) => {
      this.testType = e6.target.value;
    }}>
            <ion-select-option value="F2">${t5("ui.testTypeTicket")}</ion-select-option>
            <ion-select-option value="F1">${t5("ui.testTypeInvoice")}</ion-select-option>
          </ion-select>
        </ion-item>
        <div class="test-actions">
          <ion-button @click=${() => this.runTest()} ?disabled=${this.testing || !this.canRunLiveTest}>${this.testing ? t5("ui.testRunning") : t5("ui.testRun")}</ion-button>
          <ion-button fill="outline" @click=${() => this.createTestInvoice()} ?disabled=${this.creatingInvoice || !canCreateInvoice}>${this.creatingInvoice ? t5("ui.testCreateInvoiceRunning") : t5("ui.testCreateInvoice")}</ion-button>
        </div>
        ${!isTesting ? b2`<p class="hint">${t5("ui.testInvoiceTestingOnly")}</p>` : A}
        ${this.invoiceCreated ? b2`<ok-inline-feedback tone="success" icon="checkmark-circle-outline">${t5("ui.testInvoiceCreated")}</ok-inline-feedback>` : A}
        <!-- Why the button is off, in the terms of the road this hub is actually on (verifactu#41).
             It used to read «not configured — Choose file…», which was a file picker's label
             pasted where a reason belongs: it named no road and pointed at nothing to press.
             Then, while the engine still demanded the core identity, the delegated road was told
             the test «needs a certificate of your own» — the hub#1485 defect, since that hub has
             none and never will. With the engine on resolve_route the only hub left without a
             test is the one without a ROAD, and what it needs is the enrolment above.
             Silent while either read is in flight: «you have not enrolled» is a claim, and we do
             not get to make it before the door has answered. -->
        ${this.canRunLiveTest || this.routeLoading || this.gatewayLoading ? A : b2`<p class="hint">${t5(this.route === ROUTE_DELEGATED ? "ui.testNeedsGatewayIdentity" : "ui.testNeedsOwnCertificate")}</p>`}
        ${d3 ? b2`
              <!-- WHY it failed, composed from the code and not pasted from the engine
                   (hub#1575). The same composer the events list uses, so the two surfaces cannot
                   describe one run differently; the engine prose stays as the fallback for a run
                   this catalogue cannot name. -->
              <ok-inline-feedback tone=${d3.cert_ok ? "success" : "danger"} heading=${t5("ui.testCert")} icon="ribbon-outline">${certReasonSentence(CATALOG8, erplora7().locale, (catalog, key, params) => erplora7().t(catalog, key, params), d3, (minor) => erplora7().formatMoney(minor)) ?? d3.cert_message ?? ""}</ok-inline-feedback>
              ${this.renderTestGateway(t5)}
              <!-- WHICH road answered (hub#1485). Read off the RUN and not off the current state:
                   a diagnostic from before an enrolment describes the road it actually took, and
                   relabelling it with today's would rewrite history on screen. Omitted for a run
                   older than hub#1485, which did not record one. -->
              ${d3.route ? b2`<div class="kv"><span class="k">${t5("ui.testRoute")}</span><span>${t5(d3.route === ROUTE_DELEGATED ? "ui.routeDelegated" : "ui.routeOwn")}</span></div>` : A}
              <div class="kv"><span class="k">${t5("ui.testEnv")}</span><code>${d3.environment ?? ""}</code></div>
              <div class="kv"><span class="k">${t5("ui.testHuella")}</span><code>${d3.huella ?? ""}</code></div>
              <div class="kv">
                <span class="k">${t5("ui.testAeatLink")}</span>
                ${d3.qr_url ? b2`<a class="link" href=${d3.qr_url} target="_blank" rel="noopener noreferrer">${t5("ui.testAeatLinkGo")}</a>` : A}
              </div>
              <div class="kv"><span class="k">${t5("ui.testAeatResp")}</span>${this.renderAeat(t5)}</div>
            ` : b2`<p class="hint">${t5("ui.testNoRun")}</p>`}
      </div>
    </div>`;
  }
  /**
   * Where the hub files and the ONE way to change it (hub#2079): the core's go-live, never a
   * select. Buttons, not a form field, because it is not saved with the form — it is its own act,
   * confirmed, with its own refusals.
   */
  renderEnvironment(t5) {
    const live = this.environment === "production";
    const g3 = this.goLive ?? {};
    return b2`<ion-item lines="none">
      <div class="prod">
        <div class="kv">
          <span class="k">${t5("ui.envAeat")}</span>
          <ok-status-pill data-testid="settings-environment" tone=${live ? "success" : "neutral"}>${t5(live ? "ui.envProduction" : "ui.envTesting")}</ok-status-pill>
        </div>
        ${!live && g3.can_go_live ? b2`<p class="hint">${t5("ui.goLiveHint")}</p>
            <ion-button size="small" data-testid="settings-go-live" ?disabled=${this.switchingEnvironment} @click=${() => void this.confirmEnvironment(true)}>
              <ion-icon slot="start" name="rocket-outline"></ion-icon>
              ${t5("ui.goLiveAction")}
            </ion-button>` : A}
        ${!live && !g3.can_go_live ? b2`<p class="hint">${t5("ui.goLiveDemoHint")}</p>` : A}
        ${live && !g3.filed_for_real ? b2`<p class="hint">${t5("ui.standDownHint")}</p>
            <ion-button size="small" fill="outline" data-testid="settings-stand-down" ?disabled=${this.switchingEnvironment} @click=${() => void this.confirmEnvironment(false)}>
              ${t5("ui.standDownAction")}
            </ion-button>` : A}
        ${live && g3.filed_for_real ? b2`<p class="hint">${t5("ui.goLiveOneWayHint")}</p>` : A}
        ${this.goLiveNotice ? b2`<ok-inline-feedback tone=${this.goLiveNotice.tone} data-testid="settings-go-live-notice">${t5(this.goLiveNotice.key)}</ok-inline-feedback>` : A}
      </div>
    </ion-item>`;
  }
  /**
   * The door exists but did not answer (verifactu#125): the reason and a retry, read-only. No pill,
   * because we do not know where the hub files; no select, because the engine does not read it.
   */
  renderGoLiveUnavailable(t5) {
    return b2`<ion-item lines="none">
      <div class="prod">
        <span class="k">${t5("ui.envAeat")}</span>
        <ok-inline-feedback tone="warning" data-testid="settings-go-live-unavailable">${t5(this.goLiveUnavailable ?? "ui.errGoLiveStateUnavailable")}</ok-inline-feedback>
        ${this.goLiveNotice ? b2`<ok-inline-feedback tone=${this.goLiveNotice.tone} data-testid="settings-go-live-notice">${t5(this.goLiveNotice.key)}</ok-inline-feedback>` : A}
        <ion-button size="small" fill="outline" data-testid="settings-go-live-retry" ?disabled=${this.switchingEnvironment} @click=${() => void this.retryGoLive()}>
          <ion-icon slot="start" name="refresh-outline"></ion-icon>
          ${t5("ui.actionRetry")}
        </ion-button>
      </div>
    </ion-item>`;
  }
  render() {
    const t5 = (k2) => erplora7().t(CATALOG8, k2);
    const issuerNif = (this.cfg.issuer_nif || "").trim();
    return b2`
      <h2>${t5("ui.settingsTitle")}</h2>
      ${this.error ? b2`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : A}
      ${this.saved ? b2`<ok-inline-feedback tone="success" icon="checkmark-circle-outline">${t5("ui.settingsSaved")}</ok-inline-feedback>` : A}
      <!-- verifactu#62: saving with the switch ON succeeds even with the capability denied (the
           save is plain SQL and must not depend on the gate), so the screen owes the owner the
           step that is left. Only after a save that turned it ON — a permanent notice would be
           noise in the hubs where the permission is granted, which the module cannot tell apart. -->
      ${this.savedEnabled ? b2`<ok-inline-feedback tone="warning" icon="key-outline" heading=${t5("ui.capabilityTitle")}>
            ${t5("ui.enabledNeedsPermission")}
            <ion-button size="small" fill="outline" @click=${() => this.goToPermissions()}>
              <ion-icon slot="start" name="open-outline"></ion-icon>
              ${t5("ui.capabilityGoPermissions")}
            </ion-button>
          </ok-inline-feedback>` : A}
      <!-- El permiso del certificado, SOLO cuando el runtime lo ha denegado de verdad
           (verifactu#62). Como fila permanente era un espejo de Ajustes → Permisos y no se podía
           tocar; como aviso es lo único que hay entre «he pulsado probar» y el silencio. Lo que
           falta ANTES de intentarlo lo dice la franja de arriba, que alimenta el bloque setup
           del manifest. (Sin acentos graves en un comentario de plantilla Lit: rompen el bundle.) -->
      ${this.capabilityDenied ? b2`<ok-inline-feedback
            tone="danger"
            icon="key-outline"
            heading=${t5("ui.capabilityTitle")}
          >
            ${t5("ui.capabilityHint")}
            <ion-button size="small" fill="outline" @click=${() => this.goToPermissions()}>
              <ion-icon slot="start" name="open-outline"></ion-icon>
              ${t5("ui.capabilityGoPermissions")}
            </ion-button>
          </ok-inline-feedback>` : A}
      <div class="cols">
        <form class="card" @submit=${(e6) => this.save(e6)}>
          <ion-list>
            <ion-item>
              <ion-toggle style=${GREEN} ?checked=${!!this.cfg.enabled} @ionChange=${(e6) => this.set("enabled", e6.target.checked)}>${t5("ui.enableVerifactu")}</ion-toggle>
            </ion-item>
            <!-- La VIA, como interruptor (hub#1871): es una ELECCION que se guarda en el core.
                 Apagarlo deja el .p12 guardado y remite ERPlora; encenderlo sin .p12 lleva a
                 subirlo. Lo que se toca a diario vive aqui; lo que cuesta —el fichero y el
                 papeleo— vive en Configuracion. -->
            <ion-item lines="none">
              <div class="cert">
                <div class="cert-head">
                  <ion-label>${t5("ui.cfgOwnTitle")}</ion-label>
                  <ion-toggle
                    style=${GREEN}
                    data-testid="settings-own-certificate"
                    ?checked=${this.signsWithOwnCertificate}
                    ?disabled=${this.routeLoading || this.switchingRoute}
                    @ionChange=${(e6) => void this.onOwnToggle(e6)}
                  ></ion-toggle>
                </div>
                <p class="hint">${t5(
      this.signsWithOwnCertificate ? "ui.cfgOwnOnHint" : this.certificateStatus?.present ? "ui.cfgOwnOffKeptHint" : "ui.cfgOwnOffHint"
    )}</p>
                ${this.routeNotice ? b2`<ok-inline-feedback tone=${this.routeNotice.tone} data-testid="settings-route-notice">${t5(this.routeNotice.key)}</ok-inline-feedback>` : A}
                <ion-button size="small" fill="outline" @click=${() => this.goConfig(this.signsWithOwnCertificate ? "own" : "delegated")}>
                  <ion-icon slot="start" name="open-outline"></ion-icon>
                  ${t5("ui.cfgGoConfig")}
                </ion-button>
              </div>
            </ion-item>
            ${this.goLive ? this.renderEnvironment(t5) : this.goLiveUnavailable ? this.renderGoLiveUnavailable(t5) : !this.goLiveAbsent ? A : b2`<ion-item>
              <ion-select label=${t5("ui.envAeat")} label-placement="stacked" .value=${this.cfg.environment || "testing"} @ionChange=${(e6) => this.set("environment", e6.target.value)}>
                <ion-select-option value="testing">${t5("ui.envTesting")}</ion-select-option>
                <ion-select-option value="production">${t5("ui.envProduction")}</ion-select-option>
              </ion-select>
            </ion-item>`}
          </ion-list>
          <div class="card-actions">
            <ion-button type="submit" ?disabled=${this.saving || this.loading}>${this.saving ? t5("ui.saving") : t5("ui.save")}</ion-button>
          </div>
        </form>

        ${this.renderTestCard(t5)}
        ${this.renderDeclaration(t5)}
      </div>
    `;
  }
};
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "cfg", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "loading", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "saving", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "error", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "saved", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "diag", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "testing", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "testType", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "showProducer", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "declaration", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "declarationError", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "creatingInvoice", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "invoiceCreated", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "capabilityDenied", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "savedEnabled", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "transmission", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "routeLoading", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "certificateStatus", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "switchingRoute", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "routeNotice", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "gateway", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "gatewayLoading", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "goLive", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "goLiveAbsent", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "goLiveUnavailable", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "switchingEnvironment", 2);
__decorateClass([
  r5()
], ErpVerifactuSettings.prototype, "goLiveNotice", 2);
define("erp-verifactu-settings", ErpVerifactuSettings);
