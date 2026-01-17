"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Edit2, Trash2, MessageSquare, AlertCircle } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

interface IReview {
	_id: string;
	user: {
		_id: string;
		name: string;
		email: string;
		image?: {
			url: string;
			publicId: string;
		};
	};
	rating: number;
	comment: string;
	createdAt: string;
	updatedAt: string;
}

interface ReviewSectionProps {
	groceryId: string;
}

const ReviewSection = ({ groceryId }: ReviewSectionProps) => {
	const { data: session } = useSession();
	const [reviews, setReviews] = useState<IReview[]>([]);
	const [averageRating, setAverageRating] = useState<number>(0);
	const [totalReviews, setTotalReviews] = useState<number>(0);
	const [loading, setLoading] = useState(true);
	const [showReviewForm, setShowReviewForm] = useState(false);
	const [editingReview, setEditingReview] = useState<IReview | null>(null);
	const [formData, setFormData] = useState({ rating: 5, comment: "" });
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		fetchReviews();
	}, [groceryId]);

	const fetchReviews = async () => {
		try {
			setLoading(true);
			const { data } = await axios.get(`/api/reviews/${groceryId}`);
			if (data.success) {
				setReviews(data.data.reviews);
				setAverageRating(data.data.averageRating);
				setTotalReviews(data.data.totalReviews);
			}
		} catch (error: any) {
			console.error("Failed to fetch reviews:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleSubmitReview = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!session?.user) {
			toast.error("Please login to submit a review");
			return;
		}

		if (!formData.comment.trim()) {
			toast.error("Please write a comment");
			return;
		}

		try {
			setSubmitting(true);

			if (editingReview) {
				// Update existing review
				const { data } = await axios.put(
					`/api/reviews/review/${editingReview._id}`,
					formData
				);
				if (data.success) {
					toast.success("Review updated successfully");
					fetchReviews();
					resetForm();
				}
			} else {
				// Create new review
				const { data } = await axios.post(`/api/reviews/${groceryId}`, formData);
				if (data.success) {
					toast.success("Review submitted successfully");
					fetchReviews();
					resetForm();
				}
			}
		} catch (error: any) {
			const message =
				error.response?.data?.message || "Failed to submit review";
			toast.error(message);
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteReview = async (reviewId: string) => {
		if (!confirm("Are you sure you want to delete this review?")) return;

		try {
			const { data } = await axios.delete(`/api/reviews/review/${reviewId}`);
			if (data.success) {
				toast.success("Review deleted successfully");
				fetchReviews();
			}
		} catch (error: any) {
			toast.error(error.response?.data?.message || "Failed to delete review");
		}
	};

	const handleEditReview = (review: IReview) => {
		setEditingReview(review);
		setFormData({ rating: review.rating, comment: review.comment });
		setShowReviewForm(true);
	};

	const resetForm = () => {
		setFormData({ rating: 5, comment: "" });
		setEditingReview(null);
		setShowReviewForm(false);
	};

	const renderStars = (rating: number, interactive = false, size = "w-5 h-5") => {
		return (
			<div className="flex gap-1">
				{[1, 2, 3, 4, 5].map((star) => (
					<button
						key={star}
						type={interactive ? "button" : undefined}
						disabled={!interactive}
						onClick={() => interactive && setFormData({ ...formData, rating: star })}
						className={`${size} ${
							interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""
						}`}
					>
						<Star
							className={`${size} ${
								star <= rating
									? "fill-amber-400 text-amber-400"
									: "text-gray-300"
							}`}
						/>
					</button>
				))}
			</div>
		);
	};

	const userReview = reviews.find((r) => r.user._id === session?.user?.id);

	return (
		<div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl p-6 lg:p-8 space-y-6">
			{/* Header with Average Rating */}
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b">
				<div>
					<h2 className="text-2xl font-bold text-gray-900 mb-2">
						Customer Reviews
					</h2>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-xl">
							<Star className="w-5 h-5 fill-amber-400 text-amber-400" />
							<span className="text-xl font-bold text-gray-900">
								{averageRating.toFixed(1)}
							</span>
						</div>
						<p className="text-sm text-gray-600">
							Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
						</p>
					</div>
				</div>

				{session?.user && !userReview && (
					<button
						onClick={() => setShowReviewForm(!showReviewForm)}
						className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
					>
						<MessageSquare className="w-4 h-4" />
						Write a Review
					</button>
				)}
			</div>

			{/* Review Form */}
			<AnimatePresence>
				{showReviewForm && (
					<motion.form
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						onSubmit={handleSubmitReview}
						className="bg-emerald-50 rounded-2xl p-6 space-y-4"
					>
						<h3 className="font-semibold text-gray-900">
							{editingReview ? "Edit Your Review" : "Share Your Experience"}
						</h3>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Your Rating
							</label>
							{renderStars(formData.rating, true, "w-8 h-8")}
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Your Review
							</label>
							<textarea
								value={formData.comment}
								onChange={(e) =>
									setFormData({ ...formData, comment: e.target.value })
								}
								placeholder="Tell us what you think about this product..."
								rows={4}
								maxLength={1000}
								className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
							/>
							<p className="text-xs text-gray-500 mt-1">
								{formData.comment.length}/1000 characters
							</p>
						</div>

						<div className="flex gap-3">
							<button
								type="submit"
								disabled={submitting}
								className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-5 py-2.5 rounded-xl font-semibold transition-all"
							>
								{submitting ? "Submitting..." : editingReview ? "Update Review" : "Submit Review"}
							</button>
							<button
								type="button"
								onClick={resetForm}
								className="px-5 py-2.5 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all"
							>
								Cancel
							</button>
						</div>
					</motion.form>
				)}
			</AnimatePresence>

			{/* Reviews List */}
			<div className="space-y-4">
				{loading ? (
					<div className="text-center py-10">
						<div className="inline-block w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
					</div>
				) : reviews.length === 0 ? (
					<div className="text-center py-10 bg-gray-50 rounded-2xl">
						<AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
						<p className="text-gray-600 font-medium">No reviews yet</p>
						<p className="text-sm text-gray-500 mt-1">
							Be the first to share your experience!
						</p>
					</div>
				) : (
					reviews.map((review) => {
						const isOwner = review.user._id === session?.user?.id;
						return (
							<motion.div
								key={review._id}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								className="bg-gray-50 rounded-2xl p-5 space-y-3"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
{review.user.image?.url ? (
												<img
													src={review.user.image.url}
													alt={review.user.name}
													className="w-10 h-10 rounded-full object-cover border border-emerald-200"
												/>
											) : (
												<div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
													{review.user.name.charAt(0).toUpperCase()}
												</div>
											)}
											<div>
												<p className="font-semibold text-gray-900">
													{review.user.name}
												</p>
												<p className="text-xs text-gray-500">
													{new Date(review.createdAt).toLocaleDateString("en-US", {
														year: "numeric",
														month: "long",
														day: "numeric",												})}{" "}
												at{" "}
												{new Date(review.createdAt).toLocaleTimeString("en-US", {
													hour: "2-digit",
													minute: "2-digit",
													hour12: true,													})}
												</p>
											</div>
										</div>
										{renderStars(review.rating)}
									</div>

									{isOwner && (
										<div className="flex gap-2">
											<button
												onClick={() => handleEditReview(review)}
												className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-white rounded-lg transition-all"
												title="Edit review"
											>
												<Edit2 className="w-4 h-4" />
											</button>
											<button
												onClick={() => handleDeleteReview(review._id)}
												className="p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded-lg transition-all"
												title="Delete review"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									)}
								</div>

								<p className="text-gray-700 leading-relaxed">{review.comment}</p>

								{review.updatedAt !== review.createdAt && (
									<p className="text-xs text-gray-500 italic">
										Edited on{" "}
										{new Date(review.updatedAt).toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
										})}{" "}
										at{" "}
										{new Date(review.updatedAt).toLocaleTimeString("en-US", {
											hour: "2-digit",
											minute: "2-digit",
											hour12: true,
										})}
									</p>
								)}
							</motion.div>
						);
					})
				)}
			</div>
		</div>
	);
};

export default ReviewSection;
