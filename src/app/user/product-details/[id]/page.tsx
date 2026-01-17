"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import {
	ArrowLeft,
	Check,
	ChevronRight,
	Clock3,
	Heart,
	Loader2,
	Minus,
	Plus,
	ShieldCheck,
	ShoppingCart,
	Sparkles,
	Star,
	Truck,
	Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";

import Navbar from "@/components/Navbar";
import GroceryItemCard from "@/components/GroceryItemCard";
import VariantSelector from "@/components/common/VariantSelector";
import PriceDisplay from "@/components/common/PriceDisplay";
import PriceComparisonInfo from "@/components/common/PriceComparisonInfo";
import ReviewSection from "@/components/ReviewSection";
import {
	addGuestCartApi,
	addToCartApi,
	fetchCartApi,
	getGuestCart,
	updateCartQuantityApi,
	updateGuestCartApi,
} from "@/hooks/cart.api";
import { calculateDiscountPercentUI } from "@/lib/client/price";
import { setCart } from "@/redux/features/cartSlice";
import { setGroceries } from "@/redux/features/grocerySlice";
import { AppDispatch, RootState } from "@/redux/store";
import {
	getPriceRange,
	hasVariablePricing,
	getBestDealVariant,
} from "@/lib/utils/priceUtils";

interface IVariant {
	_id: string;
	label: string;
	unit: { value: number; unit: string; multiplier?: number };
	price: { mrp: number; selling: number; discountPercent?: number };
	countInStock?: number;
	isDefault?: boolean;
}

interface IGrocery {
	_id: string;
	name: string;
	description?: string;
	brand?: string;
	category: { _id: string; name: string };
	images?: Array<{ url: string; publicId: string }>;
	variants: IVariant[];
	badges?: { isBestSeller?: boolean; isNew?: boolean };
}

const shimmer = "data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='g'%3E%3Cstop stop-color='%23f0fdf4' offset='20%25'/%3E%3Cstop stop-color='%23dcfce7' offset='50%25'/%3E%3Cstop stop-color='%23f0fdf4' offset='70%25'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='%23f8fafc'/%3E%3Crect id='r' width='400' height='400' fill='url(%23g)'/%3E%3Canimate xlink:href='%23r' attributeName='x' from='-400' to='400' dur='1s' repeatCount='indefinite'/%3E%3C/svg%3E";

const ProductDetailsPage = () => {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const dispatch = useDispatch<AppDispatch>();

	const { cartItems, appliedCoupon } = useSelector(
		(state: RootState) => state.cart
	);
	const { groceries } = useSelector((state: RootState) => state.grocery);
	const { userData } = useSelector((state: RootState) => state.user);

	const { status } = useSession();
	const isGuest = status === "unauthenticated";

	const [product, setProduct] = useState<IGrocery | null>(null);
	const [loading, setLoading] = useState(true);
	const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
		null
	);
	const [heroImage, setHeroImage] = useState<string | null>(null);
	const [isZoomed, setIsZoomed] = useState(false);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

	const defaultVariant = useMemo(
		() =>
			product?.variants?.find((v) => v.isDefault) || product?.variants?.[0],
		[product]
	);

	const selectedVariant = useMemo(() => {
		if (!product) return null;
		return (
			product.variants.find((v) => v._id === selectedVariantId) ||
			defaultVariant ||
			null
		);
	}, [product, selectedVariantId, defaultVariant]);

	const sellingPrice = selectedVariant?.price?.selling ?? 0;
	const mrpPrice = selectedVariant?.price?.mrp ?? sellingPrice;

	const cartItem = selectedVariant
		? cartItems.find((item) => item.variant?._id === selectedVariant._id)
		: undefined;
	const quantity = cartItem?.quantity ?? 0;
	const stock = selectedVariant?.countInStock ?? 0;
	const isOutOfStock = stock === 0;
	const isMaxReached = stock !== undefined && quantity >= stock;

	useEffect(() => {
		if (params?.id) {
			fetchProduct(params.id);
		}
	}, [params?.id]);

	useEffect(() => {
		if (product) {
			const variant =
				product.variants.find((v) => v.isDefault) || product.variants[0];
			setSelectedVariantId(variant?._id || null);
			setHeroImage(product.images?.[0]?.url || null);
		}
	}, [product]);

	useEffect(() => {
		if (groceries.length === 0) {
			axios
				.get("/api/groceries")
				.then((res) => dispatch(setGroceries(res.data.groceries)))
				.catch((err) => console.error("Failed to load groceries", err));
		}
	}, [groceries.length, dispatch]);

	useEffect(() => {
		if (status === "loading") return;

		const loadCart = async () => {
			if (status === "unauthenticated") {
				const guestCart = await getGuestCart();
				syncCartToStore({ items: guestCart?.items || [], isGuest: true });
			}

			if (status === "authenticated") {
				const cart = await fetchCartApi();
				syncCartToStore({
					items: cart?.items || [],
					cartId: cart?.cartId,
					isGuest: false,
				});
			}
		};

		loadCart();
	}, [status]);

	const syncCartToStore = (cart: any) => {
		let mappedCoupon: any = null;
		if (cart?.coupon) {
			let dv =
				cart.coupon.discountValue ??
				cart.coupon.discountAmount ??
				cart.coupon.discount ??
				0;
			if (
				(cart.coupon.discountType || "").toLowerCase() === "percentage" &&
				cart.coupon.discountValue === undefined &&
				appliedCoupon?.code === cart.coupon.code
			) {
				dv = appliedCoupon?.discountValue ?? dv;
			}

			mappedCoupon = {
				code: cart.coupon.code,
				discountValue: dv,
				type:
					(cart.coupon.discountType || "").toLowerCase() === "percentage"
						? "percentage"
						: "flat",
				maxDiscount: cart.coupon.maxDiscountAmount ?? cart.coupon.maxDiscount,
				minCartValue: cart.coupon.minCartValue,
			};
		}

		dispatch(
			setCart({
				items: cart?.items ?? [],
				cartId: cart?._id ?? cart?.cartId ?? null,
				isGuest: cart?.isGuest ?? false,
				appliedCoupon: mappedCoupon,
			})
		);
	};

	const fetchProduct = async (id: string) => {
		try {
			setLoading(true);
			const response = await axios.get(`/api/groceries/${id}`);
			if (response.data?.success) {
				setProduct(response.data.grocery);
			} else {
				toast.error("Product not found");
				router.back();
			}
		} catch (error) {
			console.error("Failed to fetch product", error);
			toast.error("Unable to load product right now");
			router.back();
		} finally {
			setLoading(false);
		}
	};

	const handleAddToCart = async () => {
		if (!selectedVariant?._id) return;

		try {
			if (isGuest) {
				const updatedItems = [...cartItems];
				const existing = updatedItems.find(
					(i) => i.variant._id === selectedVariant._id
				);

				if (existing) {
					if (existing.quantity < stock) existing.quantity += 1;
				} else {
					updatedItems.push({
						_id: crypto.randomUUID(),
						variant: selectedVariant,
						quantity: 1,
						priceAtAdd: {
							mrp: selectedVariant.price.mrp,
							selling: selectedVariant.price.selling,
						},
					});
				}

				dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));

				const res = await addGuestCartApi(selectedVariant._id, 1);
				toast[res.success ? "success" : "error"](res.message);
			} else {
				const res = await addToCartApi(selectedVariant._id, 1);
				syncCartToStore(res);
				toast[res.success ? "success" : "error"](res.message);
			}
		} catch (err: any) {
			toast.error(err?.message || "Something went wrong");
		}
	};

	const handleIncrease = async () => {
		if (!cartItem?._id || !selectedVariant?._id) return;

		try {
			if (isGuest) {
				const updatedItems = cartItems.map((i) =>
					i._id === cartItem._id && i.quantity < stock
						? { ...i, quantity: i.quantity + 1 }
						: i
				);

				dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));

				const newQty =
					updatedItems.find((i) => i._id === cartItem._id)?.quantity || 1;
				const res = await updateGuestCartApi(selectedVariant._id, newQty);
				toast[res.success ? "success" : "error"](res.message);
			} else {
				const res = await updateCartQuantityApi(cartItem._id, quantity + 1);
				syncCartToStore(res);
				toast[res.success ? "success" : "error"](res.message);
			}
		} catch (err: any) {
			toast.error(err?.message || "Something went wrong");
		}
	};

	const handleDecrease = async () => {
		if (!cartItem?._id || !selectedVariant?._id) return;

		try {
			if (isGuest) {
				const updatedItems = cartItems
					.map((i) =>
						i._id === cartItem._id ? { ...i, quantity: i.quantity - 1 } : i
					)
					.filter((i) => i.quantity > 0);

				dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));

				const newQty =
					updatedItems.find((i) => i._id === cartItem._id)?.quantity || 0;
				const res = await updateGuestCartApi(selectedVariant._id, newQty);
				toast[res.success ? "success" : "error"](res.message);
			} else {
				const res = await updateCartQuantityApi(cartItem._id, quantity - 1);
				syncCartToStore(res);
				toast[res.success ? "success" : "error"](res.message);
			}
		} catch (err: any) {
			toast.error(err?.message || "Something went wrong");
		}
	};

	const discountPercent = selectedVariant
		? calculateDiscountPercentUI(mrpPrice, sellingPrice)
		: 0;

	const infoPills = [
		{ icon: Clock3, title: "10-20 min", subtitle: "Lightning delivery" },
		{ icon: Truck, title: "Free above ₹500", subtitle: "No hidden charges" },
		{ icon: ShieldCheck, title: "Fresh & sealed", subtitle: "Checked twice" },
	];

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
		const x = ((e.clientX - left) / width) * 100;
		const y = ((e.clientY - top) / height) * 100;
		setMousePosition({ x, y });
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50">
				{userData && <Navbar user={userData} />}
				<div className="max-w-6xl mx-auto px-4 pt-28 pb-16">
					<div className="animate-pulse grid lg:grid-cols-2 gap-10">
						<div className="h-[420px] rounded-3xl bg-gradient-to-br from-white to-emerald-50" />
						<div className="space-y-6">
							<div className="h-6 w-3/4 bg-emerald-100 rounded-full" />
							<div className="h-12 w-full bg-emerald-50 rounded-2xl" />
							<div className="h-12 w-2/3 bg-emerald-100 rounded-2xl" />
							<div className="h-24 w-full bg-white rounded-3xl shadow" />
							<div className="h-16 w-full bg-white rounded-3xl shadow" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!product) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
				<div className="bg-white shadow-xl rounded-3xl p-10 text-center">
					<Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
					<p className="text-lg font-semibold text-gray-700">
						Product not available right now.
					</p>
					<button
						onClick={() => router.back()}
						className="mt-4 inline-flex items-center gap-2 text-red-600 hover:text-red-700"
					>
						<ArrowLeft className="w-4 h-4" /> Go back
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-lime-50">
			{userData && <Navbar user={userData} />}

			<div className="max-w-6xl mx-auto px-4 pt-28 pb-16">
				<div className="flex flex-col gap-4 mb-6">
					<div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
						<Link
							href="/"
							className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800"
						>
							Home
						</Link>
						<ChevronRight className="w-4 h-4 text-gray-400" />
						<Link
							href={`/?category=${encodeURIComponent(product.category.name)}`}
							className="text-gray-700 hover:text-emerald-700"
						>
							{product.category.name}
						</Link>
						<ChevronRight className="w-4 h-4 text-gray-400" />
						<span className="font-semibold text-gray-900">{product.name}</span>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600">
							<span className="inline-flex items-center gap-1 bg-white shadow px-3 py-2 rounded-full">
								<Clock3 className="w-4 h-4 text-emerald-600" /> 10-20 mins
							</span>
							<span className="inline-flex items-center gap-1 bg-white shadow px-3 py-2 rounded-full">
								<Truck className="w-4 h-4 text-emerald-600" /> On-time delivery
							</span>
							<span className="hidden sm:inline-flex items-center gap-1 bg-white shadow px-3 py-2 rounded-full">
								<ShieldCheck className="w-4 h-4 text-emerald-600" /> Secure packaging
							</span>
						</div>

						<div className="flex items-center gap-2">
							<button className="p-3 rounded-full bg-white shadow hover:shadow-md text-gray-600">
								<Heart className="w-5 h-5" />
							</button>
							<button
								onClick={() => router.back()}
								className="flex items-center gap-2 px-4 py-2 bg-white shadow rounded-full text-gray-700 hover:shadow-md"
							>
								<ArrowLeft className="w-4 h-4" /> Back
							</button>
						</div>
					</div>
				</div>

				<div className="grid lg:grid-cols-2 gap-10 items-start">
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.4 }}
						className="space-y-4"
					>
						<div className="flex gap-4">
							{/* Thumbnails on the left */}
							{product.images && product.images.length > 1 && (
								<div className="flex flex-col gap-3 overflow-y-auto max-h-[500px]">
									{product.images.map((img) => (
										<button
											key={img.publicId}
											onClick={() => setHeroImage(img.url)}
											className={`relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
												heroImage === img.url
													? "border-emerald-600 ring-2 ring-emerald-200 shadow-lg"
													: "border-gray-200 hover:border-emerald-300"
											}`}
										>
											<Image
												src={img.url}
												alt={product.name}
												fill
												className="object-cover"
											/>
										</button>
									))}
								</div>
							)}

							{/* Main image with zoom */}
							<div className="flex-1 relative bg-white/80 backdrop-blur rounded-3xl shadow-xl overflow-hidden">
								<div
									className="aspect-square relative cursor-crosshair"
									onMouseEnter={() => setIsZoomed(true)}
									onMouseLeave={() => setIsZoomed(false)}
									onMouseMove={handleMouseMove}
								>
									{heroImage ? (
										<>
											<Image
												src={heroImage}
												alt={product.name}
												fill
												placeholder="blur"
												blurDataURL={shimmer}
												className="object-contain p-6 transition-opacity duration-300"
												style={{ opacity: isZoomed ? 0 : 1 }}
												sizes="(max-width: 1024px) 100vw, 50vw"
											/>
											{/* Zoomed view */}
											{isZoomed && (
												<div
													className="absolute inset-0 pointer-events-none"
													style={{
														backgroundImage: `url(${heroImage})`,
														backgroundPosition: `${mousePosition.x}% ${mousePosition.y}%`,
														backgroundSize: "250%",
														backgroundRepeat: "no-repeat",
													}}
												/>
											)}
										</>
									) : (
										<div className="w-full h-full bg-emerald-50" />
									)}

									<div className="absolute top-4 left-4 flex flex-col gap-2">
										{product.badges?.isBestSeller && (
											<span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">
												<Star className="w-4 h-4" /> Bestseller
											</span>
										)}
										{product.badges?.isNew && (
											<span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
												<Sparkles className="w-4 h-4" /> New arrival
											</span>
										)}
									</div>
								</div>
							</div>
						</div>

						<div className="grid sm:grid-cols-3 gap-3">
							{infoPills.map((pill) => (
								<div
									key={pill.title}
									className="bg-white/90 backdrop-blur rounded-2xl shadow px-4 py-3 flex items-center gap-3"
								>
									<pill.icon className="w-5 h-5 text-emerald-600" />
									<div>
										<p className="text-sm font-semibold text-gray-800">
											{pill.title}
										</p>
										<p className="text-xs text-gray-500">{pill.subtitle}</p>
									</div>
								</div>
							))}
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.4, delay: 0.05 }}
						className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-6 lg:p-8 space-y-6"
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-sm font-semibold text-emerald-700">{product.category.name}</p>
								<h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
									{product.name}
								</h1>
								<p className="text-sm text-gray-500 mt-1">by {product.brand || "Fresh Mart"}</p>
							</div>
						</div>

						{/* Professional Price Display */}
						<div>
							<PriceDisplay
								mrp={mrpPrice}
								selling={sellingPrice}
								size="lg"
								showSavings={true}
								showDiscount={true}
							/>
							<p className="text-xs text-gray-500 mt-2">Inclusive of all taxes</p>
							{hasVariablePricing(product.variants) && (
								<p className="text-xs text-emerald-600 mt-1 font-medium">
									💰 Different sizes, different prices - Select your preferred size below
								</p>
							)}
						</div>

						{/* Professional Variant Selector with Dynamic Pricing */}
						<VariantSelector
							variants={product.variants}
							selectedVariantId={selectedVariantId}
							onVariantSelect={setSelectedVariantId}
							showPrices={true}
						/>

						{/* Price Comparison Info for Variable Pricing */}
						<PriceComparisonInfo variants={product.variants} />

						<div className="flex items-center gap-3 text-sm text-gray-700">
							<span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-2 rounded-xl font-semibold">
								<ShieldCheck className="w-4 h-4" /> Fresh stock
							</span>
							{isOutOfStock ? (
								<span className="text-red-600 font-semibold">Out of stock</span>
							) : stock <= 5 ? (
								<span className="text-orange-600 font-semibold">Only {stock} left</span>
							) : (
								<span className="text-emerald-700 font-semibold">{stock} in stock</span>
							)}
						</div>

						<div className="flex flex-col gap-4">
							{quantity === 0 ? (
								<button
									disabled={isOutOfStock}
									onClick={handleAddToCart}
									className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-2xl py-3 font-semibold text-lg shadow-lg transition-all"
								>
									<ShoppingCart className="w-5 h-5" /> Add to cart
								</button>
							) : (
								<div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-3 py-2">
									<div className="text-sm text-emerald-800 font-semibold">
										In your cart
									</div>
									<div className="flex items-center gap-3">
										<button
											onClick={handleDecrease}
											className="w-10 h-10 rounded-full bg-white border border-emerald-200 flex items-center justify-center hover:bg-emerald-100"
										>
											<Minus className="w-4 h-4 text-emerald-700" />
										</button>
										<span className="w-8 text-center font-semibold text-emerald-800">
											{quantity}
										</span>
										<button
											disabled={isMaxReached}
											onClick={handleIncrease}
											className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white hover:bg-emerald-700 disabled:opacity-40"
										>
											<Plus className="w-4 h-4" />
										</button>
									</div>
								</div>
							)}

							<div className="grid sm:grid-cols-2 gap-3 text-sm">
								<div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
									<Zap className="w-4 h-4 text-emerald-600" />
									Freshness guaranteed
								</div>
								<div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
									<Check className="w-4 h-4 text-emerald-600" />
									Easy returns if damaged
								</div>
							</div>
						</div>

						{product.description && (
							<div className="bg-gray-50 rounded-2xl p-4">
								<h3 className="text-lg font-semibold text-gray-900 mb-2">
									Why you'll love it
								</h3>
								<p className="text-sm text-gray-600 leading-relaxed">
									{product.description}
								</p>
							</div>
						)}
					</motion.div>
				</div>

				{/* Customer Reviews Section */}
				<div className="mt-12">
					<ReviewSection groceryId={product._id} />
				</div>

				{groceries.length > 0 && (
					<div className="mt-12">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h2 className="text-2xl font-bold text-gray-900">
									More from {product.category.name}
								</h2>
								<p className="text-sm text-gray-500 mt-1">
									Explore similar products you might like
								</p>
							</div>
							<Link
								href="/"
								className="inline-flex items-center gap-2 text-emerald-700 font-semibold hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full transition-all"
							>
								View all
								<ChevronRight className="w-4 h-4" />
							</Link>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
							{groceries
								.filter((g) => g._id !== product._id && g.category._id === product.category._id)
								.slice(0, 8)
								.map((item) => (
									<GroceryItemCard key={item._id} grocery={item} />
								))}
						</div>
						{groceries.filter((g) => g._id !== product._id && g.category._id === product.category._id).length === 0 && (
							<div className="text-center py-10 bg-gray-50 rounded-3xl">
								<p className="text-gray-500">No similar products available at the moment</p>
								<Link
									href="/"
									className="inline-flex items-center gap-2 text-emerald-700 font-semibold hover:text-emerald-800 mt-4"
								>
									Browse all products
									<ChevronRight className="w-4 h-4" />
								</Link>
							</div>
						)}
					</div>
				)}
			</div>

			<div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] sm:w-auto sm:left-auto sm:right-6 sm:translate-x-0 lg:hidden">
				<div className="bg-white shadow-2xl rounded-2xl flex items-center justify-between px-4 py-3">
					<div>
						<p className="text-sm text-gray-500">Total</p>
						<p className="text-xl font-bold text-gray-900">
							₹{sellingPrice.toFixed(0)}
							{quantity > 0 && <span className="text-sm text-gray-500"> × {quantity}</span>}
						</p>
					</div>
					{quantity === 0 ? (
						<button
							disabled={isOutOfStock}
							onClick={handleAddToCart}
							className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-semibold disabled:bg-gray-300"
						>
							Add
						</button>
					) : (
						<div className="flex items-center gap-3">
							<button
								onClick={handleDecrease}
								className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
							>
								<Minus className="w-4 h-4" />
							</button>
							<span className="w-6 text-center font-semibold">{quantity}</span>
							<button
								disabled={isMaxReached}
								onClick={handleIncrease}
								className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center disabled:opacity-40"
							>
								<Plus className="w-4 h-4" />
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ProductDetailsPage;
