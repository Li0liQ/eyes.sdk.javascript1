/* eslint-disable no-use-before-define */
'use strict';
const uuid = require('./uuid');
const isInlineFrame = require('./isInlineFrame');
const isAccessibleFrame = require('./isAccessibleFrame');
const absolutizeUrl = require('./absolutizeUrl');
const processInlineCss = require('./cssom/processInlineCss');
const noop = require('./noop');
const NEED_MAP_INPUT_TYPES = new Set([
  'date',
  'datetime-local',
  'email',
  'month',
  'number',
  'password',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week',
]);
const ON_EVENT_REGEX = /^on[a-z]+$/;

function domNodesToCdt(docNode, baseUrl, log = noop) {
  const cdt = [{nodeType: Node.DOCUMENT_NODE}];
  const docRoots = [docNode];
  const canvasElements = [];
  const inlineFrames = [];

  cdt[0].childNodeIndexes = childrenFactory(cdt, docNode.childNodes);
  return {cdt, docRoots, canvasElements, inlineFrames};

  function childrenFactory(cdt, elementNodes) {
    if (!elementNodes || elementNodes.length === 0) return null;

    const childIndexes = [];
    Array.prototype.forEach.call(elementNodes, elementNode => {
      const index = elementNodeFactory(cdt, elementNode);
      if (index !== null) {
        childIndexes.push(index);
      }
    });
    return childIndexes;
  }

  function elementNodeFactory(cdt, elementNode) {
    let node, manualChildNodeIndexes, dummyUrl;
    const {nodeType} = elementNode;

    if ([Node.ELEMENT_NODE, Node.DOCUMENT_FRAGMENT_NODE].includes(nodeType)) {
      if (elementNode.nodeName !== 'SCRIPT') {
        if (
          elementNode.nodeName === 'STYLE' &&
          elementNode.sheet &&
          elementNode.sheet.cssRules.length
        ) {
          cdt.push(getCssRulesNode(elementNode));
          manualChildNodeIndexes = [cdt.length - 1];
        }

        if (elementNode.tagName === 'TEXTAREA' && elementNode.value !== elementNode.textContent) {
          cdt.push(getTextContentNode(elementNode));
          manualChildNodeIndexes = [cdt.length - 1];
        }

        node = getBasicNode(elementNode);
        node.childNodeIndexes =
          manualChildNodeIndexes ||
          (elementNode.childNodes.length ? childrenFactory(cdt, elementNode.childNodes) : []);

        if (elementNode.shadowRoot) {
          node.shadowRootIndex = elementNodeFactory(cdt, elementNode.shadowRoot);
          docRoots.push(elementNode.shadowRoot);
        }

        if (elementNode.nodeName === 'CANVAS') {
          dummyUrl = absolutizeUrl(`applitools-canvas-${uuid()}.png`, baseUrl);
          node.attributes.push({name: 'data-applitools-src', value: dummyUrl});
          canvasElements.push({element: elementNode, url: dummyUrl});
        }

        if (
          elementNode.nodeName === 'IFRAME' &&
          isAccessibleFrame(elementNode) &&
          isInlineFrame(elementNode)
        ) {
          dummyUrl = absolutizeUrl(`?applitools-iframe=${uuid()}`, baseUrl);
          node.attributes.push({name: 'data-applitools-src', value: dummyUrl});
          inlineFrames.push({element: elementNode, url: dummyUrl});
        }
      } else {
        node = getScriptNode(elementNode);
      }
    } else if (nodeType === Node.TEXT_NODE) {
      node = getTextNode(elementNode);
    } else if (nodeType === Node.DOCUMENT_TYPE_NODE) {
      node = getDocNode(elementNode);
    }

    if (node) {
      cdt.push(node);
      return cdt.length - 1;
    } else {
      return null;
    }
  }

  function nodeAttributes({attributes = {}}) {
    return Object.keys(attributes).filter(k => attributes[k] && attributes[k].name);
  }

  function getCssRulesNode(elementNode) {
    return {
      nodeType: Node.TEXT_NODE,
      nodeValue: processInlineCss(elementNode, log),
    };
  }

  function getTextContentNode(elementNode) {
    return {
      nodeType: Node.TEXT_NODE,
      nodeValue: elementNode.value,
    };
  }

  function getBasicNode(elementNode) {
    const node = {
      nodeType: elementNode.nodeType,
      nodeName: elementNode.nodeName,
      attributes: nodeAttributes(elementNode).map(key => {
        let value = elementNode.attributes[key].value;
        const name = elementNode.attributes[key].name;
        if (/^blob:/.test(value)) {
          value = value.replace(/^blob:/, '');
        } else if (ON_EVENT_REGEX.test(name)) {
          value = '';
        }
        return {
          name,
          value,
        };
      }),
    };

    if (elementNode.tagName === 'INPUT' && ['checkbox', 'radio'].includes(elementNode.type)) {
      if (elementNode.attributes.checked && !elementNode.checked) {
        const idx = node.attributes.findIndex(a => a.name === 'checked');
        node.attributes.splice(idx, 1);
      }
      if (!elementNode.attributes.checked && elementNode.checked) {
        node.attributes.push({name: 'checked'});
      }
    }

    if (
      elementNode.tagName === 'INPUT' &&
      NEED_MAP_INPUT_TYPES.has(elementNode.type) &&
      (elementNode.attributes.value && elementNode.attributes.value.value) !== elementNode.value
    ) {
      addOrUpdateAttribute(node.attributes, 'value', elementNode.value);
    }

    if (elementNode.tagName === 'OPTION' && elementNode.parentElement.value === elementNode.value) {
      addOrUpdateAttribute(node.attributes, 'selected', '');
    }

    if (elementNode.tagName === 'STYLE' && elementNode.sheet && elementNode.sheet.disabled) {
      node.attributes.push({name: 'data-applitools-disabled', value: ''});
    }
    if (
      elementNode.tagName === 'LINK' &&
      elementNode.type === 'text/css' &&
      elementNode.sheet &&
      elementNode.sheet.disabled
    ) {
      addOrUpdateAttribute(node.attributes, 'disabled', '');
    }

    return node;
  }

  function addOrUpdateAttribute(attributes, name, value) {
    const nodeAttr = attributes.find(a => a.name === name);
    if (nodeAttr) {
      nodeAttr.value = value;
    } else {
      attributes.push({name, value});
    }
  }

  function getScriptNode(elementNode) {
    return {
      nodeType: Node.ELEMENT_NODE,
      nodeName: 'SCRIPT',
      attributes: nodeAttributes(elementNode)
        .map(key => {
          const name = elementNode.attributes[key].name;
          const value = ON_EVENT_REGEX.test(name) ? '' : elementNode.attributes[key].value;
          return {
            name,
            value,
          };
        })
        .filter(attr => attr.name !== 'src'),
      childNodeIndexes: [],
    };
  }

  function getTextNode(elementNode) {
    return {
      nodeType: Node.TEXT_NODE,
      nodeValue: elementNode.nodeValue,
    };
  }

  function getDocNode(elementNode) {
    return {
      nodeType: Node.DOCUMENT_TYPE_NODE,
      nodeName: elementNode.nodeName,
    };
  }
}

module.exports = domNodesToCdt;
