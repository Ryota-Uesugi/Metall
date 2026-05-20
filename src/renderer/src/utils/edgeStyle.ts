// src/utils/edgeStyle.ts
import type { Edge, EdgeStyle, EdgeLabelStyle } from '../model/graphTypes';

export function styleEdge(e: Edge, isSelected: boolean): Edge {
  const role = (e.data?.role as string) ?? 'dependency';
  const isError = !!e.data?.isError; // ★ 型不一致フラグ

  // エラー時は赤色 (#dc3545) をベースカラーにする
  let baseColor = isSelected ? '#007bff' : (isError ? '#dc3545' : '#333');
  
  let style: EdgeStyle = {
    stroke: baseColor,
    strokeWidth: isSelected || isError ? 3 : 2, // エラー時も目立たせるため太くする
    strokeDasharray: isError ? '6,4' : 'none', // エラー時は破線で警告を表現
    markerStart: undefined,
    markerEnd: undefined,
    ...e.style,
  };
  
  let labelStyle: EdgeLabelStyle = { 
    fill: baseColor, 
    fontSize: 10, 
    fontWeight: 'bold', 
    ...e.style 
  };

  if (role === 'petri_flow') {
    style.markerEnd = isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)';
  } else if (role === 'association') {
    style.markerEnd = undefined;
  } else if (role === 'aggregation') {
    style.markerStart = isSelected ? 'url(#diamond-white-selected)' : 'url(#diamond-white)';
  } else if (role === 'composition') {
    style.markerStart = isSelected ? 'url(#diamond-black-selected)' : 'url(#diamond-black)';
  } else if (role === 'dependency') {
    style.strokeDasharray = isError ? '6,4' : '5,5';
    style.markerEnd = isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)';
  } else if (role === 'generalization') {
    style.markerEnd = isSelected ? 'url(#triangle-white-selected)' : 'url(#triangle-white)';
  } else if (role === 'realization') {
    style.strokeDasharray = isError ? '6,4' : '5,5';
    style.markerEnd = isSelected ? 'url(#triangle-white-selected)' : 'url(#triangle-white)';
  } else if (role === 'call') {
    style.stroke = isSelected ? '#0a58ca' : (isError ? '#dc3545' : '#0d6efd');
    style.markerEnd = isSelected ? 'url(#arrowhead-call-selected)' : 'url(#arrowhead-call)';
    labelStyle.fill = style.stroke;
  } else if (role === 'reference') {
    style.stroke = isSelected ? '#146c43' : (isError ? '#dc3545' : '#198754');
    style.strokeDasharray = isError ? '6,4' : '5,5';
    style.markerEnd = isSelected ? 'url(#arrowhead-reference-selected)' : 'url(#arrowhead-reference)';
    labelStyle.fill = style.stroke;
  } else if (role === 'copy') {
    style.stroke = isSelected ? '#e85e0c' : (isError ? '#dc3545' : '#fd7e14');
    style.markerEnd = isSelected ? 'url(#arrowhead-copy-selected)' : 'url(#arrowhead-copy)';
    labelStyle.fill = style.stroke;
  } else if (role === 'read') {
    style.stroke = isSelected ? '#087990' : (isError ? '#dc3545' : '#0dcaf0');
    style.markerEnd = isSelected ? 'url(#arrowhead-read-selected)' : 'url(#arrowhead-read)';
    labelStyle.fill = style.stroke;
  } else if (role === 'write') {
    style.stroke = isSelected ? '#b02a37' : '#dc3545';
    style.markerEnd = isSelected ? 'url(#arrowhead-write-selected)' : 'url(#arrowhead-write)';
    labelStyle.fill = style.stroke;
  }

  return { ...e, style, animated: false, label: '', labelStyle };
}