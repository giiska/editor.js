
/**
 * Set of utils for working with a Cross-Block Selection and Cross-Input Selection
 * -------------------------
 */

import type { API, BlockAPI } from '@types';
import { getClosestElement } from '../dom';
import { isEmpty } from './empty';


/**
 * Blocks input can be a native input or a contenteditable element
 */
type BlockInput = HTMLElement;

/**
 * Describes an intersected input inside a block
 */
type BlockInputIntersected = {
  input: BlockInput,
  block: BlockAPI,
};

export interface CrossInputSelection {
  blocks: BlockAPI[];
  inputs: BlockInputIntersected[];
  range: Range | null;
}

/**
 * Return a Block API
 *
 * @param wrapper - block wrapper element (.ce-block)
 * @param api - Editor API
 */
function resolveBlockByWrapper(wrapper: Element, api: API): BlockAPI {
  const blockId = wrapper.getAttribute('data-id');

  if (blockId === null) {
    throw Error('Block wrapper is lack of data-id attribute');
  }

  const block = api.blocks.getById(blockId);

  if (block === null) {
    throw Error(`Block with id ${blockId} not found`);
  }

  return block;
}

/**
 * Find Blocks that contains passed selection
 *
 * @param range - cross-block selection range
 * @param api - Editor API
 */
function findIntersectedBlocks(range: Range, api: API): BlockAPI[] {
  const startContainer = getClosestElement(range.startContainer);
  const endContainer = getClosestElement(range.endContainer);

  const startBlockWrapper = startContainer?.closest('.ce-block');
  const endBlockWrapper = endContainer?.closest('.ce-block');

  if (isEmpty(startBlockWrapper) || isEmpty(endBlockWrapper)) {
    return [];
  }

  /**
   * Range is inside a single block
   */
  if (startBlockWrapper === endBlockWrapper) {
    return [
      resolveBlockByWrapper(startBlockWrapper, api),
    ];
  }

  const blocks = [];

  let block: Element | null = startBlockWrapper;

  /**
   * Add all blocks between start and end
   */
  while (block !== null) {
    blocks.push(block);

    if (block === endBlockWrapper) {
      break;
    }

    block = block.nextElementSibling;
  }

  return blocks.map(wrapper => resolveBlockByWrapper(wrapper, api));
}


/**
 * Each block may contain multiple inputs
 * This function finds all inputs that are intersected by passed range
 *
 * @param intersectedBlocks - blocks that contain selection
 * @param range - selection range
 */
function findIntersectedInputs(intersectedBlocks: BlockAPI[], range: Range): BlockInputIntersected[] {
  /**
   * Loop over blocks and check if inputs are intersected with the range
   */
  return intersectedBlocks.reduce((acc: BlockInputIntersected[], block: BlockAPI) => {
    const inputs = block?.inputs;

    if (!inputs) {
      return acc;
    }

    inputs.forEach((input: BlockInput) => {
      if (range.intersectsNode(input)) {
        acc.push({
          input,
          block,
        });
      }
    });

    return acc;
  }, []);
}


/**
 * Returns a list of blocks and inputs that intersect with the given range
 *
 * @param api - Editor API
 */
export function useCrossInputSelection(api: API): CrossInputSelection {
  const selection = window.getSelection();

  /**
   * @todo handle native inputs
   */

  if (selection === null || !selection.rangeCount) {
    return {
      blocks: [],
      inputs: [],
      range: null,
    };
  }

  const range = selection.getRangeAt(0);

  const intersectedBlocks = findIntersectedBlocks(range, api);
  const intersectedInputs = findIntersectedInputs(intersectedBlocks, range);

  return {
    blocks: intersectedBlocks,
    inputs: intersectedInputs,
    range,
  };
}
