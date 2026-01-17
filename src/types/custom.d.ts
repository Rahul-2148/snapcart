declare module "keen-slider/keen-slider.min.css";

export interface NotificationClient {
    _id: string;
    recipient: string;
    message: string;
    type: "order" | "promotion" | "system" | "role_change";
    link?: string;
    read: boolean;
    createdAt: string;
}

export interface Coupon {
    _id: string;
    code: string;
    discountType: "FLAT" | "PERCENTAGE";
    discountValue: number;
    maxDiscountAmount?: number;
    minCartValue?: number;
    startDate: string;
    endDate: string;
    usageLimit?: number;
    usagePerUser?: number;
    usageCount?: number;
    eventTag?: string;
    isActive: boolean;
    applicableCategories?: any[];
    applicableProducts?: any[];
    createdBy: any;
    createdAt: string;
    updatedAt: string;
  }
  