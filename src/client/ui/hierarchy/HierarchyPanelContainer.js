import React, { Component } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import Tree from "@robertlong/react-ui-tree";
import "../styles/vendor/react-ui-tree/index.scss";
import "../styles/vendor/react-contextmenu/index.scss";
import { ContextMenu, MenuItem, ContextMenuTrigger, connectMenu } from "react-contextmenu";
import styles from "./HierarchyPanelContainer.scss";
import { withEditor } from "../contexts/EditorContext";
import { withDialog } from "../contexts/DialogContext";
import { withSceneActions } from "../contexts/SceneActionsContext";
import AssetDropTarget from "../explorer/AssetDropTarget";
import ErrorDialog from "../dialogs/ErrorDialog";
import DefaultNodeEditor from "../properties/DefaultNodeEditor";

function collectNodeMenuProps({ node }) {
  return node;
}

class HierarchyPanelContainer extends Component {
  static propTypes = {
    path: PropTypes.array,
    editor: PropTypes.object,
    sceneActions: PropTypes.object,
    showDialog: PropTypes.func,
    hideDialog: PropTypes.func
  };

  constructor(props) {
    super(props);

    this.state = {
      tree: this.props.editor.getNodeHierarchy(),
      singleClicked: null
    };

    this.doubleClickTimeout = null;

    const editor = this.props.editor;
    editor.signals.sceneSet.add(this.rebuildNodeHierarchy);
    editor.signals.sceneGraphChanged.add(this.rebuildNodeHierarchy);
    editor.signals.objectChanged.add(this.rebuildNodeHierarchy);
    editor.signals.objectSelected.add(this.rebuildNodeHierarchy);
  }

  onDropFile = async item => {
    if (item.file) {
      const file = item.file;

      if (file.ext === ".gltf" || file.ext === ".glb") {
        try {
          this.props.editor.addGLTFModelNode(file.name, file.uri);
        } catch (e) {
          console.error(e);

          this.props.showDialog(ErrorDialog, {
            title: "Error adding model.",
            message: e.message
          });
        }
      }
    }
  };

  onChange = (tree, parent, node) => {
    if (!node) {
      // parent and node are null when expanding/collapsing the tree.
      tree.object.isCollapsed = !tree.object.isCollapsed;
      return;
    }

    const object = node.object;
    const newParent = parent;
    let newBefore; // The object to insert the moved node before.

    if (newParent.children.length === 1) {
      newBefore = undefined;
    } else {
      const movedNodeIndex = newParent.children.indexOf(node);
      if (movedNodeIndex === newParent.children.length - 1) {
        newBefore = undefined;
      } else {
        newBefore = newParent.children[movedNodeIndex + 1].object;
      }
    }

    this.props.editor.moveObject(object, newParent.object, newBefore);
  };

  onMouseDownNode = (e, node) => {
    // Prevent double click on right click.
    if (e.button !== 0) {
      this.setState({ singleClicked: null });
      clearTimeout(this.doubleClickTimeout);
      return;
    }

    if (this.state.singleClicked === node.object) {
      this.props.editor.focusById(node.object.id);
      return;
    }

    this.props.editor.selectById(node.object.id);
    this.setState({ singleClicked: node.object });

    clearTimeout(this.doubleClickTimeout);
    this.doubleClickTimeout = setTimeout(() => {
      this.setState({ singleClicked: null });
    }, 500);
  };

  onDuplicateNode = (e, node) => {
    this.props.editor.duplicateObject(node.object);
  };

  onDeleteNode = (e, node) => {
    this.props.editor.deleteObject(node.object);
  };

  rebuildNodeHierarchy = () => {
    this.setState({
      tree: this.props.editor.getNodeHierarchy()
    });
  };

  getNodeIconClassName = node => {
    const NodeEditor = this.props.editor.getNodeEditor(node) || DefaultNodeEditor;
    return NodeEditor.iconClassName || DefaultNodeEditor.iconClassName;
  };

  renderNode = node => {
    const iconClassName = this.getNodeIconClassName(node.object);

    return (
      <ContextMenuTrigger
        attributes={{
          className: classNames("node", {
            "is-active": this.props.editor.selected && node.object.id === this.props.editor.selected.id
          }),
          onMouseDown: e => this.onMouseDownNode(e, node)
        }}
        holdToDisplay={-1}
        id="hierarchy-node-menu"
        node={node}
        collect={collectNodeMenuProps}
      >
        <div className={styles.treeNode}>
          <i className={classNames("fas", iconClassName)} />
          {this.renderNodeName(node)}
        </div>
      </ContextMenuTrigger>
    );
  };

  renderNodeName = node => {
    return <div>{node.object.name}</div>;
  };

  renderHierarchyNodeMenu = props => {
    const node = props.trigger;
    const hasParent = node && node.object.parent;
    if (!hasParent) return null;

    return (
      <ContextMenu id="hierarchy-node-menu">
        {hasParent && (
          <MenuItem onClick={this.onDuplicateNode}>
            Duplicate
            <div className={styles.menuHotkey}>⌘D</div>
          </MenuItem>
        )}
        {hasParent && <MenuItem onClick={this.onDeleteNode}>Delete</MenuItem>}
      </ContextMenu>
    );
  };

  HierarchyNodeMenu = connectMenu("hierarchy-node-menu")(this.renderHierarchyNodeMenu);

  render() {
    return (
      <div className={styles.hierarchyRoot}>
        <AssetDropTarget onDropFile={this.onDropFile}>
          <div className={styles.tree}>
            <Tree
              paddingLeft={8}
              isNodeCollapsed={false}
              draggable={true}
              tree={this.state.tree}
              renderNode={this.renderNode}
              onChange={this.onChange}
            />
            <this.HierarchyNodeMenu />
          </div>
        </AssetDropTarget>
      </div>
    );
  }
}

export default withEditor(withDialog(withSceneActions(HierarchyPanelContainer)));
