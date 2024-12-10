
interface BaseTmphContent {
  /**
   * Line number
   */
  l: number;
  /**
   * Column number
   */
  c: number;
}

export interface TmphElementAttribute extends BaseTmphContent {
  name: string;
  value: string;
}

export interface TmphElementNode extends BaseTmphContent {
  tagName: string;
  attributes?: TmphElementAttribute[];
  children?: TmphNode[];
}

export interface TmphTextNode extends BaseTmphContent {
  textContent: string;
}

export type TmphNode = TmphElementNode | TmphTextNode;

export interface TemplateDataAST {
  /**
   * Path to the parsed template file
   */
  src: string;
  /**
   * The root nodes of the template
   */
  nodes: TmphNode[];
}