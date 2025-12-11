import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Tooltip } from "@heroui/react";
import { Input, Badge } from "@heroui/react";
import { SearchIcon, FilterIcon } from "@/components/icons"; // Make sure you have this icon component
// Import component configuration with all assets
import { componentsConfig } from "@/assets/config/items";
import { ThemeSwitch } from "@/components/theme-switch";

// Component item interface
interface ComponentItem {
  name: string;
  icon: string;
  svg: string;
  class: string;
  object: string;
  args: any[];
}

// Canvas item interface (extends component with position data)
interface CanvasItem extends ComponentItem {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function Editor() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [components, setComponents] = useState<Record<string, Record<string, ComponentItem>>>({});
  const [droppedItems, setDroppedItems] = useState<CanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load component configuration
  useEffect(() => {
    setComponents(componentsConfig);
  }, []);
  // Filter components by search query
  const filteredComponents = Object.keys(components).reduce((result, category) => {
    // items in this category
    const items = components[category];

    // filter by search text
    const matched = Object.keys(items).filter((key) =>
      items[key].name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (matched.length > 0) {
      result[category] = matched.map((key) => items[key]);
    }

    return result;
  }, {} as Record<string, ComponentItem[]>);

  // Handle dragging from sidebar
  const handleDragStart = (e: React.DragEvent, item: ComponentItem) => {
    e.dataTransfer.setData("component", JSON.stringify(item));
    
    // Set custom drag preview using SVG
    if (item.svg) {
      const img = new Image();
      img.src = item.svg;
      img.width = 80;
      img.height = 80;
      e.dataTransfer.setDragImage(img, 40, 40);
    }
  };

  // Handle dropping onto canvas
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const componentData = e.dataTransfer.getData("component");
    if (!componentData) return;
    
    const item = JSON.parse(componentData) as ComponentItem;
    
    // Calculate drop position
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 40;
    const y = e.clientY - rect.top - 40;
    
    // Create new canvas item
    const newCanvasItem: CanvasItem = {
      ...item,
      id: Date.now(),
      x,
      y,
      width: 80,
      height: 80
    };
    
    setDroppedItems(prev => [...prev, newCanvasItem]);
    setSelectedItemId(newCanvasItem.id);
  };

  // Move item on canvas
  const handleItemMove = (itemId: number, newX: number, newY: number) => {
    setDroppedItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, x: newX, y: newY } : item
      )
    );
  };

  // Select item
  const handleItemClick = (itemId: number) => {
    setSelectedItemId(itemId);
  };

  // Delete item
  const handleDeleteItem = (itemId: number) => {
    setDroppedItems(prev => prev.filter(item => item.id !== itemId));
    if (selectedItemId === itemId) {
      setSelectedItemId(null);
    }
  };

  const selectedItem = droppedItems.find(item => item.id === selectedItemId);

  return (
    <div className="h-screen flex flex-col">
      {/* Header bar with menus */}
      <div className="h-14 border-b flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <Tooltip content="Back to Dashboard">
            <Button isIconOnly variant="light" onPress={() => navigate("/dashboard")}>←</Button>
          </Tooltip>
          <div className="h-6 w-px bg-gray-300 mx-2" />

          <Dropdown>
            <DropdownTrigger>
              <Button variant="light" size="sm">File</Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="File Actions">
              <DropdownItem key="new">New Diagram</DropdownItem>
              <DropdownItem key="save">Save Project (Ctrl+S)</DropdownItem>
              <DropdownItem key="export">Export as PDF</DropdownItem>
            </DropdownMenu>
          </Dropdown>

          <Dropdown>
            <DropdownTrigger>
              <Button variant="light" size="sm">Edit</Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="Edit Actions">
              <DropdownItem key="undo">Undo (Ctrl+Z)</DropdownItem>
              <DropdownItem key="redo">Redo (Ctrl+Y)</DropdownItem>
              <DropdownItem key="delete" onPress={() => selectedItemId && handleDeleteItem(selectedItemId)}>
                Delete Selected (Del)
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>

          <Dropdown>
            <DropdownTrigger>
              <Button variant="light" size="sm">View</Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="View Actions">
              <DropdownItem key="zoom-in">Zoom In (+)</DropdownItem>
              <DropdownItem key="zoom-out">Zoom Out (-)</DropdownItem>
              <DropdownItem key="fit">Fit to Screen</DropdownItem>
              <DropdownItem key="grid">Toggle Grid</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>

        <div className="font-semibold">
          Diagram Editor <span className="text-xs ml-2">ID: {projectId}</span>
        </div>

        <div className="flex gap-2">
          <ThemeSwitch />
          <Button size="sm" variant="bordered">Share</Button>
          <Button size="sm">Save Changes</Button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Component library sidebar */}
        <div className="w-64 border-r flex flex-col">
          {/* Header with search */}
          <div className="p-3 border-b">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm flex items-center gap-2">
                Components Library
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {Object.keys(components).reduce((acc, cat) => acc + Object.keys(components[cat]).length, 0)} items
                </span>
              </h3>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-3">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <SearchIcon className="w-4 h-4 text-gray-400" />
              </div>
             <input
                type="text"
                placeholder="Search components..."
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={(e) => setSearchQuery(e.target.value)}
                value={searchQuery}
              />

            </div>
            
            {/* Quick filters */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              <button className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded whitespace-nowrap">
                All
              </button>
              <button className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded whitespace-nowrap">
                Frequently Used
              </button>
              <button className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded whitespace-nowrap">
                Recent
              </button>
            </div>
          </div>
          
          {/* Component List */}
          <div className="flex-1 overflow-y-auto">
          {Object.keys(filteredComponents).map((category) => (
              <div key={category} className="mb-6 first:mt-4">
                <div className="px-4 mb-2 flex items-center justify-between group">
                  <h4 className="font-semibold text-sm text-gray-700">{category}</h4>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {Object.keys(components[category]).length}
                  </span>
                </div>
                <div className="px-2">
                  <div className="grid grid-cols-2 gap-2">
                    {filteredComponents[category].map((item) => {
                      return (
                        <div
                          key={item.name}
                          className="p-2 border rounded hover:bg-blue-50 hover:border-blue-200 cursor-move flex flex-col items-center transition-colors duration-150 group/item"
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          title={`Drag to canvas: ${item.name}`}
                        >
                          <div className="relative">
                            <img 
                              src={item.icon} 
                              alt={item.name}
                              className="w-10 h-10 object-contain mb-1 group-hover/item:scale-105 transition-transform duration-150"
                            />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-white text-[10px] flex items-center justify-center hidden group-hover/item:flex">
                              +
                            </div>
                          </div>
                          <span className="text-xs text-center line-clamp-2 text-gray-700 group-hover/item:text-blue-600">
                            {item.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Empty search state - uncomment when implementing search */}
            {/* {filteredComponents.length === 0 && (
              <div className="px-4 py-8 text-center">
                <div className="text-gray-400 mb-2">🔍</div>
                <p className="text-sm text-gray-500">No components found</p>
                <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
              </div>
            )} */}
          </div>
        </div>
        {/* Canvas area */}
        <div
          className="flex-1 relative overflow-auto"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{ position: 'relative' }}
        >
          {/* Grid background */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(#999 1px, transparent 1px)', 
              backgroundSize: '20px 20px' 
            }} 
          />
          
          {/* Dropped items */}
          {droppedItems.map((item) => (
            <div
              key={item.id}
              className={`absolute cursor-move ${
                selectedItemId === item.id ? 'ring-1 ring-blue-500' : ''
              }`}
              style={{
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
              }}
              draggable
              onClick={() => handleItemClick(item.id)}
              onDragStart={(e) => {
                e.dataTransfer.setData("move", JSON.stringify(item));
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const movedItem = JSON.parse(e.dataTransfer.getData("move"));
                if (movedItem.id === item.id) {
                  const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                  const newX = e.clientX - rect.left - 40;
                  const newY = e.clientY - rect.top - 40;
                  handleItemMove(item.id, newX, newY);
                }
              }}
            >
              <img 
                src={item.svg} 
                alt={item.name} 
                className="w-full h-full object-contain pointer-events-none"
                draggable="false"
              />
            </div>
          ))}
          
          {/* Empty canvas message */}
          {droppedItems.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8 bg-white/80 rounded-lg border">
                <div className="font-medium mb-2">Drag and drop components here</div>
                <div className="text-sm">Components from the sidebar will appear as SVG icons</div>
                <div className="mt-2 text-xs">Click to select, drag to move</div>
              </div>
            </div>
          )}
        </div>

        {/* Properties sidebar */}
        <div className="w-72 border-l p-4 hidden lg:block overflow-y-auto">
          <h3 className="font-bold text-sm mb-4">Properties</h3>
          
          {!selectedItem ? (
            <div className="text-sm">
              {droppedItems.length === 0 
                ? "No items on canvas. Drag components from the sidebar." 
                : "Click on any component to view its properties"}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected item info */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img src={selectedItem.svg} alt={selectedItem.name} className="w-10 h-10 object-contain" />
                    <div>
                      <h4 className="font-medium">{selectedItem.name}</h4>
                      <div className="text-xs">{selectedItem.class}</div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="light"
                    onPress={() => handleDeleteItem(selectedItem.id)}
                  >
                    Delete
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs block mb-1">Position</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="text-sm">X: {Math.round(selectedItem.x)}px</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">Y: {Math.round(selectedItem.y)}px</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs block mb-1">Size</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="text-sm">Width: {selectedItem.width}px</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">Height: {selectedItem.height}px</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs block mb-1">Component Type</label>
                    <div className="text-sm p-2 rounded">
                      {selectedItem.object}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Canvas stats */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Canvas Statistics</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Items:</span>
                    <span>{droppedItems.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Selected Item ID:</span>
                    <span>{selectedItem.id}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}