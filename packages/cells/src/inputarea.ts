/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { PanelLayout } from '@lumino/widgets';

import { Widget } from '@lumino/widgets';

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';

import { ICellModel } from './model';
import { Toolbar } from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';

/**
 * The class name added to input area widgets.
 */
const INPUT_AREA_CLASS = 'jp-InputArea';

/**
 * The class name added to the prompt area of cell.
 */
const INPUT_AREA_PROMPT_CLASS = 'jp-InputArea-prompt';

/**
 * The class name added to the prompt area's text indicator
 */
const INPUT_AREA_PROMPT_INDICATOR_CLASS = 'jp-InputArea-prompt-indicator';

/**
 * Class for an empty prompt indicator, indicating no execution count
 */
const INPUT_AREA_PROMPT_INDICATOR_EMPTY_CLASS =
  'jp-InputArea-prompt-indicator-empty';

/**
 * The class name added to the prompt area's toolbar
 */
const INPUT_AREA_PROMPT_TOOLBAR_CLASS = 'jp-InputArea-prompt-run';

/**
 * The class name added to OutputPrompt.
 */
const INPUT_PROMPT_CLASS = 'jp-InputPrompt';

/**
 * The class name added to the editor area of the cell.
 */
const INPUT_AREA_EDITOR_CLASS = 'jp-InputArea-editor';

/** ****************************************************************************
 * InputArea
 ******************************************************************************/

/**
 * An input area widget, which hosts a prompt and an editor widget.
 */
export class InputArea extends Widget {
  /**
   * Construct an input area widget.
   */
  constructor(options: InputArea.IOptions) {
    super();
    this.addClass(INPUT_AREA_CLASS);
    const { contentFactory, editorOptions, model } = options;
    this.model = model;
    this.contentFactory = contentFactory;

    // Prompt
    const prompt = (this._prompt = contentFactory.createInputPrompt());
    prompt.addClass(INPUT_AREA_PROMPT_CLASS);

    // Editor
    const editor = (this._editor = new CodeEditorWrapper({
      factory: contentFactory.editorFactory,
      model,
      editorOptions
    }));
    editor.addClass(INPUT_AREA_EDITOR_CLASS);

    const layout = (this.layout = new PanelLayout());
    layout.addWidget(prompt);
    layout.addWidget(editor);
  }

  /**
   * The model used by the widget.
   */
  readonly model: ICellModel;

  /**
   * The content factory used by the widget.
   */
  readonly contentFactory: InputArea.IContentFactory;

  /**
   * Get the CodeEditorWrapper used by the cell.
   */
  get editorWidget(): CodeEditorWrapper {
    return this._editor;
  }

  /**
   * Get the CodeEditor used by the cell.
   */
  get editor(): CodeEditor.IEditor {
    return this._editor.editor;
  }

  /**
   * Get the prompt widget used by the cell.
   */
  public get prompt(): IInputPrompt {
    return this._prompt;
  }

  /**
   * Get the prompt node used by the cell.
   */
  get promptNode(): HTMLElement {
    return this._prompt.node;
  }

  /**
   * Get the rendered input area widget, if any.
   */
  get renderedInput(): Widget {
    return this._rendered;
  }

  /**
   * Render an input instead of the text editor.
   */
  renderInput(widget: Widget): void {
    const layout = this.layout as PanelLayout;
    if (this._rendered) {
      this._rendered.parent = null;
    }
    this._editor.hide();
    this._rendered = widget;
    layout.addWidget(widget);
  }

  /**
   * Show the text editor.
   */
  showEditor(): void {
    if (this._rendered) {
      this._rendered.parent = null;
    }
    this._editor.show();
  }

  /**
   * Set the prompt of the input area.
   */
  setPrompt(value: string): void {
    this._prompt.executionCount = value;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._prompt = null!;
    this._editor = null!;
    this._rendered = null!;
    super.dispose();
  }

  private _prompt: IInputPrompt;
  private _editor: CodeEditorWrapper;
  private _rendered: Widget;
}

/**
 * A namespace for `InputArea` statics.
 */
export namespace InputArea {
  /**
   * The options used to create an `InputArea`.
   */
  export interface IOptions {
    /**
     * The model used by the widget.
     */
    model: ICellModel;

    /**
     * The content factory used by the widget to create children.
     */
    contentFactory: IContentFactory;

    /**
     * Editor options
     */
    editorOptions?: Omit<CodeEditor.IOptions, 'host' | 'model'>;
  }

  /**
   * An input area widget content factory.
   *
   * The content factory is used to create children in a way
   * that can be customized.
   */
  export interface IContentFactory {
    /**
     * The editor factory we need to include in `CodeEditorWrapper.IOptions`.
     *
     * This is a separate readonly attribute rather than a factory method as we need
     * to pass it around.
     */
    readonly editorFactory: CodeEditor.Factory;

    /**
     * Create an input prompt.
     */
    createInputPrompt(): IInputPrompt;
  }

  /**
   * Default implementation of `IContentFactory`.
   *
   * This defaults to using an `editorFactory` based on CodeMirror.
   */
  export class ContentFactory implements IContentFactory {
    /**
     * Construct a `ContentFactory`.
     */
    constructor(options: ContentFactory.IOptions) {
      this._editor = options.editorFactory;
    }

    /**
     * Return the `CodeEditor.Factory` being used.
     */
    get editorFactory(): CodeEditor.Factory {
      return this._editor;
    }

    /**
     * Create an input prompt.
     */
    createInputPrompt(): IInputPrompt {
      return new InputPrompt();
    }

    private _editor: CodeEditor.Factory;
  }

  /**
   * A namespace for the input area content factory.
   */
  export namespace ContentFactory {
    /**
     * Options for the content factory.
     */
    export interface IOptions {
      /**
       * The editor factory used by the content factory.
       *
       * If this is not passed, a default CodeMirror editor factory
       * will be used.
       */
      editorFactory: CodeEditor.Factory;
    }
  }
}

/** ****************************************************************************
 * InputPrompt
 ******************************************************************************/

/**
 * The interface for the input prompt.
 */
export interface IInputPrompt extends Widget {
  /**
   * The execution count of the prompt.
   */
  executionCount: string | null;

  runButtonToolbar: Toolbar | null;
}

export class InputPrompt extends Widget implements IInputPrompt {
  /*
   * Create an input prompt widget.
   */
  constructor() {
    super();
    this.addClass(INPUT_PROMPT_CLASS);

    // Two sub-elements: prompt text and run button toolbar
    const layout = (this.layout = new PanelLayout());
    const promptIndicator = (this._promptIndicator =
      new InputPromptIndicator());
    layout.addWidget(promptIndicator);

    const toolbar = (this._runButtonToolbar = new Toolbar());
    toolbar.addClass(INPUT_AREA_PROMPT_TOOLBAR_CLASS);
    layout.addWidget(toolbar);

    this.updateToolbarVisibility();
  }

  /**
   * The execution count for the prompt.
   */
  get executionCount(): string | null {
    return this._executionCount;
  }
  set executionCount(value: string | null) {
    this._executionCount = value;
    this._promptIndicator.executionCount = value;
    this.updateToolbarVisibility();
  }

  /**
   * A toolbar showing a helper button for running this cell.
   */
  public get runButtonToolbar(): Toolbar {
    return this._runButtonToolbar;
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'mouseover':
        this._isHovered = true;
        this.updateToolbarVisibility();
        break;
      case 'mouseout':
        this._isHovered = false;
        this.updateToolbarVisibility();
        break;
    }
  }

  update(): void {
    this.updateToolbarVisibility();
    super.update();
  }

  protected onAfterAttach(msg: Message): void {
    this.node.addEventListener('mouseover', this, true);
    this.node.addEventListener('mouseout', this, true);
  }

  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('mouseover', this, true);
    this.node.removeEventListener('mouseout', this, true);
  }

  private updateToolbarVisibility() {
    if (this._isHovered || !this.executionCount) {
      this.runButtonToolbar.show();
    } else {
      this.runButtonToolbar.hide();
    }
  }

  private _executionCount: string | null = null;
  private _isHovered: boolean = false;
  private _promptIndicator: InputPromptIndicator;
  private _runButtonToolbar: Toolbar;
}

export class InputPromptIndicator extends Widget {
  /*
   * Create an input prompt widget.
   */
  constructor() {
    super();
    this.addClass(INPUT_AREA_PROMPT_INDICATOR_CLASS);
  }

  /**
   * The execution count for the prompt.
   */
  get executionCount(): string | null {
    return this._executionCount;
  }
  set executionCount(value: string | null) {
    this._executionCount = value;
    if (value) {
      this.node.textContent = `[${value}]:`;
      this.removeClass(INPUT_AREA_PROMPT_INDICATOR_EMPTY_CLASS);
    } else {
      this.node.textContent = '[ ]:';
      this.addClass(INPUT_AREA_PROMPT_INDICATOR_EMPTY_CLASS);
    }
  }

  private _executionCount: string | null = null;
}
