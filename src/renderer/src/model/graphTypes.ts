import type { CSSProperties } from 'react';

export type Position = { x: number; y: number };

export type NodeType = 'groupNode' | 'blockNode' | 'placeNode' | 'transitionNode';

export type ClassKind = 'class' | 'struct' | 'enum' | 'method' | 'variable' | 'constant';
export type NodeKind = ClassKind | 'placeNode' | 'transitionNode' | (string & {});

export type MethodArg = { id: string; type: string; name: string };

export type AttributeType =
    | '@Inject'
    | '@Transaction'
    | '@Pure'
    | '@External'
    | '@Min'
    | '@Max'
    | '@Range'
    | '@InitialTag'
    | '@GrantTag'
    | '@RequireTag'
    | '@Event'
    | '@Instance'
    | (string & {});

export type Attribute = {
    id: string;
    type: AttributeType;
    params: Record<string, unknown>;
};

export type NodeData = {
    kind: NodeKind;
    label: string;
    attributes: Attribute[];
    typeDetail: string;
    isInstance: boolean;
    isPrivate?: boolean;
    args?: MethodArg[];
    boundFunctionId?: string | null;
    [key: string]: unknown;
};



export type Node = {
    id: string;
    type: NodeType;
    position: Position;
    width?: number;
    height?: number;
    data: NodeData;
    parentId?: string;
    style?: CSSProperties;
};


export type EdgeStyle = {
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
    markerEnd?: string;
    markerStart?: string;
    [key: string]: any;
};


export type EdgeLabelStyle = {
    fill?: string;
    fontSize?: number;
    fontWeight?: string | number;
    opacity?: number;
    [key: string]: any;
};


export type EdgeRole =
    | 'association'
    | 'aggregation'
    | 'composition'
    | 'dependency'
    | 'generalization'
    | 'realization'
    | 'call'
    | 'reference'
    | 'copy'
    | 'read'
    | 'write'
    | 'petri_flow'
    | (string & {});


export type Edge = {
    id: string;
    source: string;
    target: string;
    data?: { role?: EdgeRole;[k: string]: unknown };
    style?: EdgeStyle;
    animated?: boolean;
    label?: string;
    labelStyle?: EdgeLabelStyle;
};


export type Connection = {
    source: string;
    target: string;
};

export type ProjectFile = {
    nodes: Node[];
    edges: Edge[];
    petriNodes: Node[];
    petriEdges: Edge[];
};