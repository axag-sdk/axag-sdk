/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@babel/traverse' {
  import type { Node } from '@babel/types';

  interface NodePath<T = Node> {
    node: T;
    parent: Node;
    parentPath: NodePath | null;
    scope: any;
    get(key: string): NodePath | NodePath[];
    stop(): void;
  }

  interface Visitor {
    [key: string]: ((path: NodePath<any>) => void) | undefined;
  }

  function traverse(ast: Node, visitor: Visitor): void;
  export default traverse;
}
