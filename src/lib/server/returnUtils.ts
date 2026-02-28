// src/lib/server/returnUtils.ts
import { ReturnPolicy } from "@/models/returnPolicy.model";
import { ReturnRequest } from "@/models/returnRequest.model";
import { Order } from "@/models/order.model";

/**
 * Check if product can be returned and if return window is still open
 */
export async function canReturnProduct(
  groceryId: string,
  deliveredAt: Date | null,
  requestType: "return" | "replacement" = "return",
): Promise<{
  allowed: boolean;
  reason?: string;
  policy?: any;
}> {
  if (!deliveredAt) {
    return {
      allowed: false,
      reason: "Order not yet delivered",
    };
  }

  const policy = await ReturnPolicy.findOne({
    grocery: groceryId,
    isActive: true,
  });

  if (!policy || !policy.isReturnable) {
    return {
      allowed: false,
      reason: "This product is not returnable",
      policy: policy || null,
    };
  }

  // Check policy type
  if (requestType === "return" && policy.policyType === "replacement-only") {
    return {
      allowed: false,
      reason: "Only replacement is allowed for this product",
      policy,
    };
  }

  if (requestType === "replacement" && policy.policyType === "return-only") {
    return {
      allowed: false,
      reason: "Only return is allowed for this product",
      policy,
    };
  }

  // Check return window
  const daysSinceDelivery = Math.floor(
    (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceDelivery > policy.returnWindowDays) {
    return {
      allowed: false,
      reason: `Return window of ${policy.returnWindowDays} days has expired (${daysSinceDelivery} days since delivery)`,
      policy,
    };
  }

  return {
    allowed: true,
    policy,
  };
}

/**
 * Get return window information for a product
 */
export async function getReturnWindowInfo(
  groceryId: string,
  deliveredAt: Date,
): Promise<{
  returnWindowDays: number;
  daysPassed: number;
  daysRemaining: number;
  canReturn: boolean;
  expireDate: Date;
}> {
  const policy = await ReturnPolicy.findOne({
    grocery: groceryId,
    isActive: true,
  });

  const daysPassed = Math.floor(
    (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const returnWindowDays = policy?.returnWindowDays || 0;
  const daysRemaining = Math.max(0, returnWindowDays - daysPassed);
  const expireDate = new Date(
    deliveredAt.getTime() + returnWindowDays * 24 * 60 * 60 * 1000,
  );

  return {
    returnWindowDays,
    daysPassed,
    daysRemaining,
    canReturn: daysRemaining > 0 && policy?.isReturnable,
    expireDate,
  };
}

/**
 * Create or update a return request
 */
export async function processReturnRequest(
  returnRequestId: string | null,
  data: {
    orderId: string;
    orderItemId: string;
    userId: string;
    groceryId: string;
    requestType: "return" | "replacement";
    reason: string;
    description?: string;
    images?: Array<{ url: string; publicId: string }>;
  },
) {
  if (returnRequestId) {
    // Update existing
    const returnRequest = await ReturnRequest.findByIdAndUpdate(
      returnRequestId,
      {
        reason: data.reason,
        description: data.description,
        images: data.images,
      },
      { new: true },
    );
    return returnRequest;
  } else {
    // Create new
    const returnRequest = new ReturnRequest({
      order: data.orderId,
      orderItem: data.orderItemId,
      user: data.userId,
      grocery: data.groceryId,
      requestType: data.requestType,
      reason: data.reason,
      description: data.description,
      images: data.images || [],
      status: "pending",
    });
    await returnRequest.save();
    return returnRequest;
  }
}

/**
 * Get user's active returns for an order
 */
export async function getUserOrderReturns(userId: string, orderId: string) {
  return ReturnRequest.find({
    user: userId,
    order: orderId,
    status: { $in: ["pending", "approved", "in-transit", "received"] },
  }).populate("orderItem grocery");
}

/**
 * Check if order item already has a pending return
 */
export async function hasPendingReturn(orderItemId: string): Promise<boolean> {
  const existing = await ReturnRequest.findOne({
    orderItem: orderItemId,
    status: { $in: ["pending", "approved", "in-transit", "received"] },
  });
  return !!existing;
}

/**
 * Get return statistics for a product
 */
export async function getProductReturnStats(groceryId: string) {
  const stats = await ReturnRequest.aggregate([
    { $match: { grocery: groceryId } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const policy = await ReturnPolicy.findOne({ grocery: groceryId });

  return {
    totalReturns: stats.reduce((sum: number, s: any) => sum + s.count, 0),
    byStatus: stats,
    policy,
  };
}

/**
 * Process return approval and generate refund
 */
export async function approveReturn(
  returnRequestId: string,
  refundAmount: number,
  refundMethod: "original-payment" | "wallet" = "original-payment",
  notes?: string,
) {
  const returnRequest = await ReturnRequest.findByIdAndUpdate(
    returnRequestId,
    {
      status: "approved",
      approvedAt: new Date(),
      refund: {
        amount: refundAmount,
        method: refundMethod,
        transactionId: `REF-${Date.now()}`, // Generate unique ID
      },
      notes,
    },
    { new: true },
  );

  // TODO: Trigger refund processing
  // TODO: Send approval email to user
  // TODO: Generate return label

  return returnRequest;
}

/**
 * Process return approval for replacement
 */
export async function approveReplacement(
  returnRequestId: string,
  variantId: string,
  quantity: number = 1,
  notes?: string,
) {
  const returnRequest = await ReturnRequest.findByIdAndUpdate(
    returnRequestId,
    {
      status: "approved",
      approvedAt: new Date(),
      replacement: {
        variantId,
        quantity,
        shippedAt: null,
        deliveredAt: null,
      },
      notes,
    },
    { new: true },
  );

  // TODO: Create new order for replacement
  // TODO: Mark pickup scheduled
  // TODO: Send approval email to user

  return returnRequest;
}

/**
 * Reject return with reason
 */
export async function rejectReturn(
  returnRequestId: string,
  rejectionReason: string,
) {
  const returnRequest = await ReturnRequest.findByIdAndUpdate(
    returnRequestId,
    {
      status: "rejected",
      rejectedAt: new Date(),
      rejectionReason,
    },
    { new: true },
  );

  // TODO: Send rejection email to user with reason

  return returnRequest;
}

/**
 * Mark return as picked up from customer
 */
export async function markReturnPickedUp(returnRequestId: string) {
  return ReturnRequest.findByIdAndUpdate(
    returnRequestId,
    {
      status: "in-transit",
      pickedUpAt: new Date(),
    },
    { new: true },
  );
}

/**
 * Mark return as received at warehouse
 */
export async function markReturnReceived(returnRequestId: string) {
  return ReturnRequest.findByIdAndUpdate(
    returnRequestId,
    {
      status: "received",
      receivedAt: new Date(),
    },
    { new: true },
  );
}

/**
 * Complete return (refund processed or replacement delivered)
 */
export async function completeReturn(returnRequestId: string) {
  return ReturnRequest.findByIdAndUpdate(
    returnRequestId,
    {
      status: "completed",
      completedAt: new Date(),
      refund: {
        completedAt: new Date(),
      },
    },
    { new: true },
  );
}

/**
 * Cancel return request (only allowed if pending)
 */
export async function cancelReturn(returnRequestId: string, reason?: string) {
  const returnRequest = await ReturnRequest.findById(returnRequestId);

  if (!returnRequest) {
    throw new Error("Return request not found");
  }

  if (returnRequest.status !== "pending") {
    throw new Error("Can only cancel pending return requests");
  }

  returnRequest.status = "cancelled";
  returnRequest.notes = reason;
  await returnRequest.save();

  // TODO: Send cancellation email to user

  return returnRequest;
}

/**
 * Get return request details with populated references
 */
export async function getReturnRequestDetails(returnRequestId: string) {
  return ReturnRequest.findById(returnRequestId)
    .populate("order")
    .populate({
      path: "orderItem",
      populate: [{ path: "grocery" }, { path: "variant.variantId" }],
    })
    .populate("user", "name email mobile")
    .populate("grocery");
}

/**
 * Export return requests for reporting
 */
export async function exportReturns(
  filters: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    groceryId?: string;
  } = {},
) {
  const query: any = {};

  if (filters.status) query.status = filters.status;
  if (filters.groceryId) query.grocery = filters.groceryId;

  if (filters.startDate || filters.endDate) {
    query.requestedAt = {};
    if (filters.startDate) query.requestedAt.$gte = filters.startDate;
    if (filters.endDate) query.requestedAt.$lte = filters.endDate;
  }

  return ReturnRequest.find(query)
    .populate("user", "name email")
    .populate("grocery", "name")
    .sort({ requestedAt: -1 });
}
