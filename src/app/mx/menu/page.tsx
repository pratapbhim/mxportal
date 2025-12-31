"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'
import { Toaster, toast } from 'sonner'
import { Plus, Edit2, Trash2, X, Upload, Package } from 'lucide-react'
import { MXLayoutWhite } from '@/components/MXLayoutWhite'
import { fetchRestaurantById, fetchRestaurantByName, fetchMenuItems, createMenuItem, updateMenuItem, updateMenuItemStock, deleteMenuItem, getImageUploadStatus } from '@/lib/database'
import { Restaurant } from '@/lib/types'
import { DEMO_RESTAURANT_ID } from '@/lib/constants'

export const dynamic = 'force-dynamic'

// Hide scrollbar globally but keep functionality
const globalStyles = `
  ::-webkit-scrollbar { display: none; }
  html { scrollbar-width: none; -ms-overflow-style: none; }
`;

// Predefined category items
const CATEGORY_ITEMS = [
  'Biryani', 'Paratha', 'Rolls', 'Dosa', 'Noodles', 'Pasta', 'Pastry',
  'Gulab Jamun', 'Pav Bhaji', 'Shawarma', 'Salad', 'Kebab', 'Rasmalai',
  'Pizza', 'Burger', 'Momos', 'Chole Bhature', 'Idli', 'Jalebi', 'Tea', 'Thali'
];

// --- CustomizationEditor Component ---
interface CustomizationOption {
  name: string;
  price: number;
}

interface Customization {
  id: string;
  name: string;
  options: CustomizationOption[];
}

function CustomizationEditor({ customizations, setCustomizations }: { customizations: Customization[]; setCustomizations: (c: Customization[]) => void }) {
  const [newCustomizationName, setNewCustomizationName] = useState('');
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionPrice, setNewOptionPrice] = useState('');
  const [selectedCustomization, setSelectedCustomization] = useState<string | null>(null);

  const addCustomization = () => {
    if (!newCustomizationName.trim()) return;
    setCustomizations([
      ...customizations,
      { id: Date.now().toString(), name: newCustomizationName, options: [] }
    ]);
    setNewCustomizationName('');
  };

  const addOption = (customizationId: string) => {
    if (!newOptionName.trim() || isNaN(Number(newOptionPrice))) return;
    setCustomizations(customizations.map(c =>
      c.id === customizationId
        ? { ...c, options: [...c.options, { name: newOptionName, price: Number(newOptionPrice) }] }
        : c
    ));
    setNewOptionName('');
    setNewOptionPrice('');
    setSelectedCustomization(customizationId);
  };

  const removeCustomization = (customizationId: string) => {
    setCustomizations(customizations.filter(c => c.id !== customizationId));
  };

  const removeOption = (customizationId: string, optionIdx: number) => {
    setCustomizations(customizations.map(c =>
      c.id === customizationId
        ? { ...c, options: c.options.filter((_, i) => i !== optionIdx) }
        : c
    ));
  };

  return (
    <div className="space-y-3">
      {customizations.map((c, idx) => (
        <div key={c.id} className="border border-gray-200 rounded-lg p-3 mb-2 bg-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-800 text-base">{c.name}</span>
            <button type="button" className="text-red-500 text-xs ml-2 hover:underline" onClick={() => removeCustomization(c.id)}>Remove</button>
          </div>
          <div className="space-y-1">
            {c.options.length === 0 && (
              <div className="text-xs text-gray-400 italic">No options added yet</div>
            )}
            {c.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 pl-2 py-1">
                <span className="text-gray-700 text-sm">{opt.name}</span>
                <span className="text-xs text-gray-500">₹{opt.price}</span>
                <button type="button" className="text-red-400 text-xs hover:underline" onClick={() => removeOption(c.id, i)}>Remove</button>
              </div>
            ))}
            {selectedCustomization === c.id ? (
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                <input
                  type="text"
                  placeholder="Option name"
                  className="border border-gray-300 bg-white rounded px-2 py-1 text-xs w-32 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={newOptionName}
                  onChange={e => setNewOptionName(e.target.value)}
                  style={{ minWidth: '80px' }}
                />
                <input
                  type="number"
                  placeholder="Price"
                  className="border border-gray-300 bg-white rounded px-2 py-1 text-xs w-20 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  value={newOptionPrice}
                  onChange={e => setNewOptionPrice(e.target.value)}
                  style={{ minWidth: '60px' }}
                />
                <button type="button" className="text-green-600 text-xs font-bold" onClick={() => addOption(c.id)}>Add</button>
                <button type="button" className="text-gray-400 text-xs" onClick={() => setSelectedCustomization(null)}>Cancel</button>
              </div>
            ) : (
              <button type="button" className="text-blue-600 text-xs mt-2 hover:underline" onClick={() => setSelectedCustomization(c.id)}>+ Add Option</button>
            )}
          </div>
        </div>
      ))}
      <div className="flex gap-2 mt-3 items-center bg-gray-50 p-2 rounded">
        <input
          type="text"
          placeholder="Customization group (e.g. Size, Toppings)"
          className="border border-gray-300 bg-white rounded px-2 py-1 text-xs w-64 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={newCustomizationName}
          onChange={e => setNewCustomizationName(e.target.value)}
          style={{ minWidth: '120px' }}
        />
        <button type="button" className="text-green-600 text-xs font-bold" onClick={addCustomization}>Add Customization</button>
      </div>
    </div>
  );
}

interface MenuItem {
  id: string;
  name: string;
  category: 'VEG' | 'NON_VEG' | 'BEVERAGES' | 'DESSERTS' | 'OTHER' | string;
  category_item: string;
  price: number;
  offer_price?: number;
  image_url?: string;
  in_stock: boolean;
  description?: string;
  customizations?: Customization[];
}

function MenuContent() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    category: 'VEG',
    category_item: '',
    customCategory: '',
    price: '',
    offerPrice: '',
    description: '',
    in_stock: true,
    image_url: '',
    image: null as File | null,
    customizations: [] as Customization[],
  });
  const [imagePreview, setImagePreview] = useState('');
  const [addError, setAddError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const searchParams = useSearchParams()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [viewCustModal, setViewCustModal] = useState<{ open: boolean; item: MenuItem | null }>({ open: false, item: null });
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [showStockModal, setShowStockModal] = useState(false)
  const [stockToggleItem, setStockToggleItem] = useState<{ id: string; newStatus: boolean } | null>(null)
  const [isTogglingStock, setIsTogglingStock] = useState(false)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'VEG',
    category_item: '',
    customCategory: '',
    price: '',
    offerPrice: '',
    description: '',
    in_stock: true,
    image_url: '',
    image: null as File | null,
    customizations: [] as Customization[],
  });
  const [editImagePreview, setEditImagePreview] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    category: 'VEG',
    customCategory: '',
    price: '',
    description: '',
    in_stock: true,
    image: null as File | null,
    image_url: '',
    hasCustomizations: false,
    customizations: [] as Array<{ id: string; name: string; options: string[] }>
  })

  const [imageUploadStatus, setImageUploadStatus] = useState<any>(null)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [isDraggingImage, setIsDraggingImage] = useState(false)

  useEffect(() => {
    const getRestaurantId = async () => {
      let id = searchParams.get('restaurantId')
      if (!id) id = typeof window !== 'undefined' ? localStorage.getItem('selectedRestaurantId') : null
      if (!id) id = DEMO_RESTAURANT_ID
      setRestaurantId(id)
    }
    getRestaurantId()
  }, [searchParams])

  useEffect(() => {
    if (!restaurantId) return
    const loadData = async () => {
      setIsLoading(true)
      try {
        let data = await fetchRestaurantById(restaurantId)
        if (!data && !restaurantId.match(/^GMM\d{4}$/)) {
          data = await fetchRestaurantByName(restaurantId)
        }
        if (data) setRestaurant(data)
        
        const items = await fetchMenuItems(restaurantId)
        const mappedItems = items.map((item: any) => ({
          id: item.id,
          name: item.item_name,
          category: item.category,
          category_item: item.category_item || '',
          price: item.price,
          offer_price: item.offer_price || undefined,
          image_url: item.image_url,
          in_stock: item.in_stock,
          description: item.description,
          customizations: (() => {
            if (Array.isArray(item.customizations)) return item.customizations;
            if (typeof item.customizations === 'string') {
              try {
                const parsed = JSON.parse(item.customizations);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            }
            if (item.customizations && typeof item.customizations === 'object') {
              return Array.isArray(item.customizations) ? item.customizations : [];
            }
            return [];
          })()
        }))
        console.log('Loaded items with category_item:', mappedItems.map(i => ({ name: i.name, category_item: i.category_item })))
        setMenuItems(mappedItems)

        const status = await getImageUploadStatus(restaurantId)
        setImageUploadStatus(status)
      } catch (error) {
        console.error('Error loading menu:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [restaurantId])

  async function handleAddItem() {
    setAddError('');
    if (!addForm.name.trim()) return setAddError('Name is required');
    if (!addForm.category_item.trim() && !addForm.customCategory.trim()) 
      return setAddError('Please select a food item or enter custom category');
    if (!addForm.price.trim()) return setAddError('Actual price is required');
    if (addForm.offerPrice && !addForm.price) return setAddError('Actual price is required if offer price is set');
    
    // Determine final category_item: if customCategory is filled, use that, otherwise use category_item
    const finalCategoryItem = addForm.customCategory.trim() ? addForm.customCategory : addForm.category_item;
    
    setIsSaving(true);
    try {
      let imageUrl = addForm.image_url;
      if (addForm.image) {
        imageUrl = imagePreview;
      }

      const offerPriceValue = addForm.offerPrice.trim() ? Number(addForm.offerPrice) : null;
      const customizations = addForm.customizations || [];

      const newItem = {
        item_name: addForm.name,
        category: addForm.category,
        category_item: finalCategoryItem,
        price: Number(addForm.price),
        offer_price: offerPriceValue,
        description: addForm.description,
        in_stock: addForm.in_stock,
        image_url: imageUrl || null,
        customizations,
      };

      // Debug log for restaurantId
      console.log('Menu Item Save: restaurantId', restaurantId);
      const result = await createMenuItem({
        restaurant_id: restaurantId || '',
        ...newItem
      });
      
      if (result && result.id) {
        setMenuItems(prev => [
          {
            id: result.id,
            name: newItem.item_name,
            category: newItem.category,
            category_item: newItem.category_item,
            price: newItem.price,
            offer_price: newItem.offer_price === null ? undefined : newItem.offer_price,
            image_url: newItem.image_url === null ? undefined : newItem.image_url,
            in_stock: newItem.in_stock,
            description: newItem.description,
            customizations: newItem.customizations,
          },
          ...prev,
        ]);
        setShowAddModal(false);
        setAddForm({ 
          name: '', 
          category: 'VEG', 
          category_item: '', 
          customCategory: '', 
          price: '', 
          offerPrice: '', 
          description: '', 
          in_stock: true, 
          image_url: '', 
          image: null, 
          customizations: [] 
        });
        setImagePreview('');
        toast.success('Item added successfully!');
      } else {
        setAddError('Failed to add item.');
      }
    } catch (e) {
      console.error('Error adding item:', e);
      setAddError('Error saving item.');
    }
    setIsSaving(false);
  }

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingId(item.id);
    setEditImagePreview(item.image_url || '');
    setEditForm({
      name: item.name,
      category: item.category,
      category_item: item.category_item || '',
      customCategory: '',
      price: item.price.toString(),
      offerPrice: item.offer_price?.toString() || '',
      description: item.description || '',
      in_stock: item.in_stock,
      image_url: item.image_url || '',
      image: null,
      customizations: item.customizations || [],
    });
    setShowEditModal(true);
  };

  async function handleSaveEdit() {
    setEditError('');
    if (!editForm.name.trim()) return setEditError('Name is required');
    if (!editForm.category_item.trim() && !editForm.customCategory.trim()) 
      return setEditError('Please select a food item or enter custom category');
    if (!editForm.price.trim()) return setEditError('Actual price is required');
    if (editForm.offerPrice && !editForm.price) return setEditError('Actual price is required if offer price is set');
    
    toast.info('Saving changes... This will update the item in your menu.');
    
    setIsSavingEdit(true);
    try {
      let imageUrl = editForm.image_url;
      if (editForm.image) {
        imageUrl = editImagePreview;
      }
      
      const offerPriceValue = editForm.offerPrice.trim() ? Number(editForm.offerPrice) : null;
      
      // Determine final category_item: if customCategory is filled, use that, otherwise use category_item
      const finalCategoryItem = editForm.customCategory.trim() ? editForm.customCategory : editForm.category_item;
      
      const updatedItem = {
        item_name: editForm.name,
        category: editForm.category,
        category_item: finalCategoryItem,
        price: Number(editForm.price),
        offer_price: offerPriceValue,
        description: editForm.description,
        in_stock: editForm.in_stock,
        image_url: typeof imageUrl === 'string' && imageUrl.startsWith('http') ? imageUrl : editForm.image_url,
        customizations: editForm.customizations || [],
      };
      
      const result = await updateMenuItem(editingId || '', updatedItem);
      
      if (result) {
        setMenuItems(prev => prev.map(item => 
          item.id === editingId ? {
            ...item,
            name: result.item_name,
            category: result.category,
            category_item: result.category_item,
            price: result.price,
            offer_price: result.offer_price === null ? undefined : result.offer_price,
            image_url: result.image_url,
            in_stock: result.in_stock,
            description: result.description,
            customizations: result.customizations || [],
          } : item
        ));
        setShowEditModal(false);
        toast.success('Item updated successfully!');
      } else {
        setEditError('Failed to update item.');
      }
    } catch (e) {
      console.error('Error updating item:', e);
      setEditError('Error updating item.');
    }
    setIsSavingEdit(false);
  }

  async function handleDeleteItem() {
    if (!deleteItemId) return;
    
    setIsDeleting(true);
    try {
      const result = await deleteMenuItem(deleteItemId);
      if (result) {
        setMenuItems(prev => prev.filter(item => item.id !== deleteItemId));
        setShowDeleteModal(false);
        setDeleteItemId(null);
        toast.success('Item deleted successfully!');
      } else {
        toast.error('Failed to delete item.');
      }
    } catch (error) {
      toast.error('Error deleting item.');
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleStockToggle() {
    if (!stockToggleItem) return;
    
    setIsTogglingStock(true);
    try {
      const result = await updateMenuItemStock(stockToggleItem.id, stockToggleItem.newStatus);
      if (result) {
        setMenuItems(prev => prev.map(item => 
          item.id === stockToggleItem.id 
            ? { ...item, in_stock: stockToggleItem.newStatus }
            : item
        ));
        setShowStockModal(false);
        setStockToggleItem(null);
        toast.success(`Item marked as ${stockToggleItem.newStatus ? 'In Stock' : 'Out of Stock'}!`);
      } else {
        toast.error('Failed to update stock status.');
      }
    } catch (error) {
      toast.error('Error updating stock status.');
    } finally {
      setIsTogglingStock(false);
    }
  }

  const processImageFile = (file: File, isEdit: boolean = false) => {
    const canAddImage = !imageUploadStatus || 
      imageUploadStatus.totalUsed < 10

    if (!canAddImage && !formData.image_url) {
      setShowSubscriptionModal(true)
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      if (isEdit) {
        setEditImagePreview(dataUrl);
        setEditForm(prev => ({ ...prev, image_url: dataUrl }));
      } else {
        setImagePreview(dataUrl);
        setAddForm(prev => ({ ...prev, image_url: dataUrl }));
      }
    }
    reader.readAsDataURL(file)
    
    if (isEdit) {
      setEditForm(prev => ({ ...prev, image: file }));
    } else {
      setAddForm(prev => ({ ...prev, image: file }));
    }
  }

  const inStock = menuItems.filter(item => item.in_stock).length;
  const outStock = menuItems.filter(item => !item.in_stock).length;
  const outStockPercent = menuItems.length ? Math.round((outStock / menuItems.length) * 100) : 0;

  const categories = [
    { label: 'All Items', value: 'ALL' },
    { label: 'Veg', value: 'VEG' },
    { label: 'Non-Veg', value: 'NON_VEG' },
    { label: 'Beverages', value: 'BEVERAGES' },
    { label: 'Desserts', value: 'DESSERTS' },
    { label: 'Others', value: 'OTHER' },
  ];
  
  const filteredItems = selectedCategory === 'ALL'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);
    
  const searchedItems = searchTerm
    ? filteredItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : filteredItems;

  return (
    <MXLayoutWhite restaurantName={restaurant?.restaurant_name} restaurantId={restaurantId || DEMO_RESTAURANT_ID}>
      <div className="min-h-screen bg-white">
        <Toaster />
        <style>{globalStyles}</style>

        {/* Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between px-6 pt-6 pb-4 border-b border-gray-200 gap-4">
          {isLoading ? (
            <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
              <div className="flex flex-col gap-2 w-full md:w-auto">
                <div className="h-8 w-40 bg-gray-200 rounded" />
                <div className="h-4 w-64 bg-gray-100 rounded" />
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 flex gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                    <div className="h-4 w-10 bg-gray-100 rounded" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                    <div className="h-4 w-10 bg-gray-100 rounded" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                    <div className="h-4 w-12 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="h-10 w-40 bg-orange-200 rounded-lg" />
              </div>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Menu Items</h1>
                <p className="text-gray-600 mt-1 text-sm">Manage your restaurant menu items</p>
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className={`bg-gray-50 px-4 py-3 rounded-lg border border-gray-200`}>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Total Items</div>
                      <div className="text-base font-bold text-gray-900">{menuItems.length}</div>
                    </div>
                    <div className="h-8 w-px bg-gray-300"></div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">In Stock</div>
                      <div className="text-base font-bold text-green-600">{inStock}</div>
                    </div>
                    <div className="h-8 w-px bg-gray-300"></div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">Out of Stock (%)</div>
                      <div className="text-base font-bold text-red-600">{`${outStockPercent}%`}</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-all text-sm"
                >
                  <Plus size={16} />
                  Add New Item
                </button>
              </div>
            </>
          )}
        </div>

        {/* Search and Category Bar */}
        <div className="px-6 pt-6 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {isLoading ? (
            <>
              <div className="relative w-full md:w-96 animate-pulse">
                <div className="h-12 w-full bg-gray-100 rounded-lg mb-2" />
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto animate-pulse">
                {categories.map((cat, idx) => (
                  <div key={cat.value} className={`h-10 ${idx === 0 ? 'w-28' : 'w-24'} bg-gray-100 rounded-lg`} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  placeholder="Search items by name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:border-orange-500 text-base text-gray-900 placeholder-gray-500"
                  style={{ color: '#111827' }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all text-sm ${
                      selectedCategory === cat.value
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Menu Items Grid */}
        <div className="px-6 py-4 relative">
          {isLoading ? (
            <div className="w-full flex flex-col gap-8 animate-pulse">
              <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[160px]">
                    <div className="flex p-3 h-full">
                      <div className="w-16 h-16 flex-shrink-0 mr-3 bg-gray-200 rounded-lg" />
                      <div className="flex-1 space-y-3 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                        <div className="h-3 bg-gray-100 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (searchedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package size={48} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-700">No menu items found</h3>
              <p className="text-gray-500 mt-2">
                {searchTerm ? 'Try a different search term' : 'Add your first menu item to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchedItems.map((item) => {
                const hasOffer = typeof item.offer_price === 'number' && item.offer_price < item.price;
                const discountPercent = hasOffer && typeof item.offer_price === 'number'
                  ? Math.round(((item.price - item.offer_price) / item.price) * 100)
                  : 0;
                return (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-300 shadow-sm hover:shadow-md transition-shadow min-h-[160px]">
                    <div className="flex p-3 h-full">
                      <div className="w-16 h-16 flex-shrink-0 mr-3">
                        <img 
                          src={item.image_url && item.image_url !== '' ? item.image_url : '/placeholder.png'} 
                          alt={item.name} 
                          className="w-full h-full object-cover rounded-lg border border-gray-200" 
                        />
                      </div>
                      <div className="flex-1 flex flex-col min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-gray-900 truncate">
                              {item.name}
                            </div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wide mt-0.5">
                              {item.category} {item.category_item && `- ${item.category_item}`}
                            </div>
                          </div>
                          <label className="inline-flex items-center cursor-pointer ml-2 flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={item.in_stock}
                              onChange={() => {
                                setStockToggleItem({ id: item.id, newStatus: !item.in_stock });
                                setShowStockModal(true);
                              }}
                              className="sr-only peer"
                            />
                            <div className={`w-8 h-4.5 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-all relative`}>
                              <div className={`absolute left-0.5 top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-md transition-transform ${item.in_stock ? 'translate-x-4' : ''}`}></div>
                            </div>
                          </label>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                          {hasOffer ? (
                            <>
                              <span className="text-base font-bold text-orange-700">₹{item.offer_price}</span>
                              <span className="text-sm font-semibold text-gray-500 line-through">₹{item.price}</span>
                              <span className="ml-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-xs font-bold">
                                {discountPercent}% OFF
                              </span>
                            </>
                          ) : (
                            <span className="text-base font-bold text-orange-700">₹{item.price}</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-600 line-clamp-2 mb-3 flex-grow">
                            {item.description}
                          </p>
                        )}
                        <div className="flex flex-row gap-2 mt-3 w-full">
                          {Array.isArray(item.customizations) && item.customizations.length > 0 && (
                            <button
                              onClick={e => { e.stopPropagation(); setViewCustModal({ open: true, item }); }}
                              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-700 font-semibold rounded-lg border border-gray-200 hover:bg-orange-50 transition-all text-xs whitespace-nowrap"
                              type="button"
                              style={{ minWidth: 0 }}
                            >
                              Cust.
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-all text-xs whitespace-nowrap"
                          >
                            <Edit2 size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setDeleteItemId(item.id);
                              setShowDeleteModal(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg border border-red-200 hover:bg-red-100 transition-all text-xs whitespace-nowrap"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* View Customizations Modal */}
        {viewCustModal.open && viewCustModal.item && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setViewCustModal({ open: false, item: null })}>
            <div
              className="bg-white rounded-xl shadow-xl w-full max-w-md mx-2 p-0 border border-gray-100 relative animate-fadeIn"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h2 className="text-base md:text-lg font-bold text-gray-900">Customizations</h2>
                <button
                  onClick={() => setViewCustModal({ open: false, item: null })}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  tabIndex={0}
                  aria-label="Close"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
                {Array.isArray(viewCustModal.item.customizations) && viewCustModal.item.customizations.length > 0 ? (
                  <div className="space-y-4">
                    {viewCustModal.item.customizations.map((group: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                        <div className="font-semibold text-gray-800 mb-1 text-sm">{group.name}</div>
                        <ul className="list-disc pl-5 text-xs text-gray-700">
                          {group.options.map((opt: any, i: number) => (
                            <li key={i} className="flex items-center justify-between py-0.5">
                              <span>{opt.name}</span>
                              {opt.price && (
                                <span className="ml-2 text-gray-500">₹{opt.price}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No customizations available.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Item Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={e => {
              if (e.target === e.currentTarget) setShowAddModal(false);
            }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-2 md:mx-0 p-0 md:p-0 border border-gray-100 relative animate-fadeIn"
              style={{ minWidth: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Add New Menu Item</h2>
                  <p className="text-xs md:text-sm text-gray-500 mt-0.5">Enter details for the new menu item</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  tabIndex={0}
                  aria-label="Close"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              {/* Form */}
              <form className="px-5 py-4 max-h-[70vh] overflow-y-auto" autoComplete="off" onSubmit={e => { e.preventDefault(); handleAddItem(); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                  {/* Item Name */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Item Name *</label>
                    <input
                      type="text"
                      placeholder="Enter item name"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900"
                      value={addForm.name}
                      onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  {/* Description */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Description (Optional)</label>
                    <textarea
                      placeholder="Enter description"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900 min-h-[38px] resize-none"
                      value={addForm.description}
                      onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  
                  {/* Category Type */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Category Type *</label>
                    <select
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900"
                      value={addForm.category}
                      onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                      required
                    >
                      <option value="VEG">Veg</option>
                      <option value="NON_VEG">Non-Veg</option>
                      <option value="BEVERAGES">Beverages</option>
                      <option value="DESSERTS">Desserts</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  
                  {/* Category Item Dropdown */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Food Item *</label>
                    <select
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900"
                      value={addForm.category_item}
                      onChange={e => {
                        const value = e.target.value;
                        setAddForm(f => ({ 
                          ...f, 
                          category_item: value,
                          customCategory: value === 'other_custom' ? f.customCategory : '' 
                        }));
                      }}
                      required
                    >
                      <option value="">Select a food item</option>
                      {CATEGORY_ITEMS.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                      <option value="other_custom">Other (Type your own)</option>
                    </select>
                    
                    {/* Custom category input - Only show when "Other (Type your own)" is selected */}
                    {addForm.category_item === 'other_custom' && (
                      <input
                        type="text"
                        placeholder="Enter custom food item name"
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900 mt-1"
                        value={addForm.customCategory}
                        onChange={e => setAddForm(f => ({ ...f, customCategory: e.target.value }))}
                        required
                      />
                    )}
                  </div>
                  
                  {/* Image */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Image (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full text-gray-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                      style={{ color: '#222' }}
                      onChange={e => {
                        const file = e.target.files && e.target.files[0];
                        if (file) {
                          processImageFile(file, false);
                        }
                      }}
                    />
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="mt-1 w-16 h-16 object-cover rounded-md border" />
                    )}
                  </div>
                  
                  {/* Actual Price */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Actual Price *</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Enter actual price"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900"
                      value={addForm.price}
                      onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
                      required
                    />
                  </div>
                  
                  {/* Offer Price */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Offer Price (Optional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Enter offer price"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900"
                      value={addForm.offerPrice}
                      onChange={e => setAddForm(f => ({ ...f, offerPrice: e.target.value }))}
                    />
                    <span className="text-xs text-gray-400">Leave empty if no offer price</span>
                  </div>
                  
                  {/* Stock Status */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Stock Status</label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addForm.in_stock}
                          onChange={e => setAddForm(f => ({ ...f, in_stock: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className={`w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-all relative`}>
                          <div className={`absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-md transition-transform ${addForm.in_stock ? 'translate-x-4' : ''}`}></div>
                        </div>
                      </label>
                      <span className={`text-xs font-semibold ${addForm.in_stock ? 'text-green-600' : 'text-red-600'}`}>
                        {addForm.in_stock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {addError && <div className="text-red-600 text-xs font-bold mt-2">{addError}</div>}
                
                {/* Customizations Section */}
                <div className="mt-4">
                  <label className="block text-sm font-bold text-gray-800 mb-1">Customizations (Optional)</label>
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <CustomizationEditor
                      customizations={addForm.customizations}
                      setCustomizations={customizations => setAddForm(f => ({ ...f, customizations }))}
                    />
                  </div>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-end gap-2 mt-5">
                  <button
                    className="px-5 py-1.5 rounded-md font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-all text-sm"
                    onClick={() => setShowAddModal(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className={`px-7 py-1.5 rounded-md font-bold text-white transition-all text-sm ${
                      isSaving || !addForm.name.trim() || !addForm.price.trim() || 
                      (!addForm.category_item && !addForm.customCategory)
                        ? 'bg-orange-200 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                    onClick={handleAddItem}
                    disabled={
                      isSaving || !addForm.name.trim() || !addForm.price.trim() || 
                      (!addForm.category_item && !addForm.customCategory)
                    }
                    type="submit"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Item Modal */}
        {showEditModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-2 md:mx-0 p-0 md:p-0 border border-gray-100 relative animate-fadeIn">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900">Edit Menu Item</h2>
                  <p className="text-xs md:text-sm text-gray-500 mt-0.5">Update details for this menu item</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  tabIndex={0}
                  aria-label="Close"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              {/* Form */}
              <form className="px-5 py-4 max-h-[70vh] overflow-y-auto" autoComplete="off" onSubmit={e => { e.preventDefault(); handleSaveEdit(); }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                  {/* Item Name */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Item Name *</label>
                    <input
                      type="text"
                      placeholder="Enter item name"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  {/* Description */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Description (Optional)</label>
                    <textarea
                      placeholder="Enter description"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900 min-h-[38px] resize-none"
                      value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  
                  {/* Category Type */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Category Type *</label>
                    <select
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900"
                      value={editForm.category}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                      required
                    >
                      <option value="VEG">Veg</option>
                      <option value="NON_VEG">Non-Veg</option>
                      <option value="BEVERAGES">Beverages</option>
                      <option value="DESSERTS">Desserts</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  
                  {/* Category Item Dropdown */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Food Item *</label>
                    <select
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900"
                      value={editForm.category_item}
                      onChange={e => {
                        const value = e.target.value;
                        setEditForm(f => ({ 
                          ...f, 
                          category_item: value,
                          customCategory: value === 'other_custom' ? f.customCategory : '' 
                        }));
                      }}
                      required
                    >
                      <option value="">Select a food item</option>
                      {CATEGORY_ITEMS.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                      <option value="other_custom">Other (Type your own)</option>
                    </select>
                    
                    {/* Custom category input - Only show when "Other (Type your own)" is selected */}
                    {editForm.category_item === 'other_custom' && (
                      <input
                        type="text"
                        placeholder="Enter custom food item name"
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900 mt-1"
                        value={editForm.customCategory}
                        onChange={e => setEditForm(f => ({ ...f, customCategory: e.target.value }))}
                        required
                      />
                    )}
                  </div>
                  
                  {/* Image */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Image (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full text-gray-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                      style={{ color: '#222' }}
                      onChange={e => {
                        const file = e.target.files && e.target.files[0];
                        if (file) {
                          processImageFile(file, true);
                        }
                      }}
                    />
                    {editImagePreview && (
                      <img src={editImagePreview} alt="Preview" className="mt-1 w-16 h-16 object-cover rounded-md border" />
                    )}
                  </div>
                  
                  {/* Actual Price */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Actual Price *</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Enter actual price"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900"
                      value={editForm.price}
                      onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                      required
                    />
                  </div>
                  
                  {/* Offer Price */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Offer Price (Optional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Enter offer price"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-md focus:border-orange-400 focus:ring-1 focus:ring-orange-100 text-sm text-gray-900"
                      value={editForm.offerPrice}
                      onChange={e => setEditForm(f => ({ ...f, offerPrice: e.target.value }))}
                    />
                    <span className="text-xs text-gray-400">Leave empty if no offer price</span>
                  </div>
                  
                  {/* Stock Status */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-700">Stock Status</label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.in_stock}
                          onChange={e => setEditForm(f => ({ ...f, in_stock: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className={`w-8 h-4 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-all relative`}>
                          <div className={`absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-md transition-transform ${editForm.in_stock ? 'translate-x-4' : ''}`}></div>
                        </div>
                      </label>
                      <span className={`text-xs font-semibold ${editForm.in_stock ? 'text-green-600' : 'text-red-600'}`}>
                        {editForm.in_stock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {editError && <div className="text-red-600 text-xs font-bold mt-2">{editError}</div>}
                
                {/* Customizations Section */}
                <div className="mt-4">
                  <label className="block text-sm font-bold text-gray-800 mb-1">Customizations (Optional)</label>
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                    <CustomizationEditor
                      customizations={editForm.customizations || []}
                      setCustomizations={customizations => setEditForm(f => ({ ...f, customizations }))}
                    />
                  </div>
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-end gap-2 mt-5">
                  <button
                    className="px-5 py-1.5 rounded-md font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-all text-sm"
                    onClick={() => setShowEditModal(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className={`px-7 py-1.5 rounded-md font-bold text-white transition-all text-sm ${
                      isSavingEdit || !editForm.name.trim() || !editForm.price.trim() || 
                      (!editForm.category_item && !editForm.customCategory)
                        ? 'bg-orange-200 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                    onClick={handleSaveEdit}
                    disabled={
                      isSavingEdit || !editForm.name.trim() || !editForm.price.trim() || 
                      (!editForm.category_item && !editForm.customCategory)
                    }
                    type="submit"
                  >
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Menu Item</h3>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to delete this item? This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-all"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteItem}
                    className="flex-1 px-4 py-2.5 rounded-lg font-bold text-white bg-red-500 hover:bg-red-600 transition-all"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stock Toggle Confirmation Modal */}
        {showStockModal && stockToggleItem && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <div className="text-center">
                  <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${stockToggleItem.newStatus ? 'bg-green-100' : 'bg-red-100'} mb-4`}>
                    {stockToggleItem.newStatus ? (
                      <div className="h-6 w-6 text-green-600">✓</div>
                    ) : (
                      <div className="h-6 w-6 text-red-600">✗</div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {stockToggleItem.newStatus ? 'Mark as In Stock' : 'Mark as Out of Stock'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {stockToggleItem.newStatus 
                      ? 'This item will be available for customers to order.' 
                      : 'This item will be hidden from customers and marked as unavailable.'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowStockModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-all"
                    disabled={isTogglingStock}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStockToggle}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-white transition-all ${
                      stockToggleItem.newStatus 
                        ? 'bg-green-500 hover:bg-green-600' 
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                    disabled={isTogglingStock}
                  >
                    {isTogglingStock ? 'Updating...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MXLayoutWhite>
  );
}

// Export a Suspense-wrapped page for Next.js app directory compliance
export default function MenuPage() {
  return (
    <Suspense>
      <MenuContent />
    </Suspense>
  );
}