"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface DeliveryRatingProps {
  assignmentId: string;
  onRatingSubmitted?: () => void;
}

export function DeliveryRating({
  assignmentId,
  onRatingSubmitted,
}: DeliveryRatingProps) {
  const [score, setScore] = useState(5);
  const [review, setReview] = useState("");
  const [hoveredScore, setHoveredScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch("/api/delivery/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          score,
          review,
          ratedBy: "customer",
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        onRatingSubmitted?.();
      } else {
        alert("Failed to submit rating");
      }
    } catch (error) {
      console.error("Rating error:", error);
      alert("Error submitting rating");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <p className="text-green-700 font-medium">
          ✓ Thank you for your rating!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Rate Your Delivery Experience
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            How would you rate your delivery?
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setScore(star)}
                onMouseEnter={() => setHoveredScore(star)}
                onMouseLeave={() => setHoveredScore(0)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  size={32}
                  className={
                    star <= (hoveredScore || score)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {score === 1 && "Poor"}
            {score === 2 && "Fair"}
            {score === 3 && "Good"}
            {score === 4 && "Very Good"}
            {score === 5 && "Excellent"}
          </p>
        </div>

        {/* Review */}
        <div>
          <label
            htmlFor="review"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Share your feedback (optional)
          </label>
          <textarea
            id="review"
            value={review}
            onChange={(e) => setReview(e.target.value.slice(0, 500))}
            placeholder="Tell us about your delivery experience..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
          />
          <p className="text-xs text-gray-600 mt-1">{review.length}/500</p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {loading ? "Submitting..." : "Submit Rating"}
        </button>
      </form>
    </div>
  );
}
