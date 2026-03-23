"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import Link from "next/link";
import HtmlEditor from "@/components/HtmlEditor";
import { useConfirmation } from "@/components/common/ConfirmationModal";
import { toast } from "sonner";
import { 
  Users, 
  Send, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Mail, 
  CheckCircle, 
  XCircle,
  Clock,
  Plus,
  Eye,
  Trash2,
  Edit,
  Loader
} from "lucide-react";

interface Subscriber {
  email: string;
  verified?: boolean;
  unsubscribedAt?: string | null;
  subscribedAt?: string;
}

interface Campaign {
  _id: string;
  title: string;
  subject: string;
  content?: string;
  htmlContent?: string;
  sentTo?: string;
  status: "draft" | "scheduled" | "sent" | "failed";
  recipientCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
}

interface Stats {
  subscribers: {
    total: number;
    verified: number;
    unverified: number;
    unsubscribed: number;
  };
  campaigns: {
    total: number;
    sent: number;
    draft: number;
    scheduled: number;
  };
  templates: {
    total: number;
  };
  recentCampaigns: Array<{
    title: string;
    recipientCount: number;
    openCount: number;
    clickCount: number;
    sentAt: string;
  }>;
}

interface Template {
  id: string;
  name: string;
  subject: string;
}

export default function AdminNewsletterPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "subscribers" | "campaigns" | "templates">("overview");
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [showGenerateBulkModal, setShowGenerateBulkModal] = useState(false);
  const [generatingBulkEmail, setGeneratingBulkEmail] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatingCampaign, setGeneratingCampaign] = useState(false);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const { confirm, Modal: ConfirmationModal } = useConfirmation();
  
  // Campaign form state
  const [newCampaign, setNewCampaign] = useState({
    title: "",
    subject: "",
    content: "",
    htmlContent: "",
    sentTo: "verified",
    scheduledAt: "",
    selectedTemplate: "",
  });

  // Bulk email state
  const [bulkEmail, setBulkEmail] = useState({
    subject: "",
    htmlContent: "",
    recipientType: "all-users", // all-users, verified-subscribers, all-subscribers
  });

  // AI Campaign generation state
  const [aiCampaign, setAiCampaign] = useState({
    campaignType: "weekly-deals",
    topic: "",
    keywords: "",
    tone: "professional",
    audience: "grocery-customers",
  });

  // AI Bulk Email generation state
  const [aiBulkEmail, setAiBulkEmail] = useState({
    topic: "",
    keywords: "",
    tone: "professional",
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      if (activeTab === "subscribers") {
        const res = await axios.get("/api/newsletter");
        setSubs(res.data?.subscribers || []);
      } else if (activeTab === "campaigns") {
        const res = await axios.get("/api/admin/newsletter/campaigns");
        setCampaigns(res.data?.campaigns || []);
      } else if (activeTab === "templates") {
        // Templates already loaded
        setLoading(false);
      } else {
        const res = await axios.get("/api/admin/newsletter/stats");
        setStats(res.data?.stats || null);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    try {
      const res = await axios.get("/api/admin/newsletter/templates");
      setTemplates(res.data?.templates || []);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  }

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingCampaignId) {
        // Update existing campaign
        await axios.put(`/api/admin/newsletter/campaigns/${editingCampaignId}`, newCampaign);
        toast.success("Campaign updated successfully!");
      } else {
        // Create new campaign
        await axios.post("/api/admin/newsletter/campaigns", newCampaign);
        toast.success("Campaign created successfully!");
      }
      
      setShowCreateModal(false);
      setEditingCampaignId(null);
      setNewCampaign({
        title: "",
        subject: "",
        content: "",
        htmlContent: "",
        sentTo: "verified",
        scheduledAt: "",
        selectedTemplate: "",
      });
      loadData();
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error(editingCampaignId ? "Failed to update campaign" : "Failed to create campaign");
    }
  }

  async function handleEditCampaign(campaignId: string) {
    try {
      const res = await axios.get(`/api/admin/newsletter/campaigns/${campaignId}`);
      const campaign = res.data.campaign;
      
      // Format HTML content for better display in editor with proper indentation
      let formattedHtml: string = campaign.htmlContent || "";
      if (formattedHtml) {
        // Split tags and content
        const parts = formattedHtml
          .split(/(<[^>]+>)/g)
          .filter((p: string) => p.trim());
        let indentLevel = 0;
        const selfClosingTags = /<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)[\s/>]/i;
        const blockTags = /^<\/?(?:div|p|ul|ol|li|h[1-6]|section|article|header|footer|nav|main|form|table|tbody|thead|tfoot|tr|td|th|blockquote|pre|address)/i;
        
        formattedHtml = parts.map((part, i) => {
          const isTag = /^</.test(part);
          if (!isTag) return part.trim() ? '  '.repeat(indentLevel) + part.trim() : '';
          
          if (selfClosingTags.test(part)) {
            return '  '.repeat(indentLevel) + part;
          }
          
          const isClosing = /^<\//.test(part);
          const isBlock = blockTags.test(part);
          
          if (isClosing && isBlock) {
            indentLevel = Math.max(0, indentLevel - 1);
          }
          
          const line = '  '.repeat(indentLevel) + part;
          
          if (!isClosing && isBlock) {
            indentLevel++;
          }
          
          return line;
        }).filter(line => line.trim()).join('\n');
      }
      
      setNewCampaign({
        title: campaign.title,
        subject: campaign.subject,
        content: campaign.content || "",
        htmlContent: formattedHtml,
        sentTo: campaign.sentTo,
        scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) : "",
        selectedTemplate: "",
      });
      
      setEditingCampaignId(campaignId);
      setShowCreateModal(true);
    } catch (error) {
      console.error("Error loading campaign:", error);
      toast.error("Failed to load campaign");
    }
  }

  async function handleBulkEmail(e: React.FormEvent) {
    e.preventDefault();
    const confirmed = await confirm({
      title: "Send Bulk Email",
      message: "Are you sure you want to send this email to all selected recipients?",
      confirmText: "Send",
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await axios.post("/api/admin/newsletter/bulk-send", bulkEmail);
          toast.success(res.data.message || "Bulk email sent successfully!");
          setShowBulkEmailModal(false);
          setBulkEmail({
            subject: "",
            htmlContent: "",
            recipientType: "all-users",
          });
          loadData();
        } catch (error) {
          console.error("Error sending bulk email:", error);
          toast.error("Failed to send bulk email");
        }
      },
    });
  }

  function handleTemplateSelect(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setNewCampaign((prev) => ({
        ...prev,
        selectedTemplate: templateId,
        title: template.name,
        subject: template.subject,
      }));
    } else {
      setNewCampaign((prev) => ({ ...prev, selectedTemplate: templateId }));
    }
  }

  async function handleGenerateWithAI(e: React.FormEvent) {
    e.preventDefault();
    
    if (!aiCampaign.topic.trim()) {
      toast.error("Please enter a topic for the campaign");
      return;
    }
    
    setGeneratingCampaign(true);
    const loadingToast = toast.loading("🤖 AI is generating your campaign...");
    try {
      const res = await axios.post("/api/admin/newsletter/generate-campaign", aiCampaign);
      const { campaign } = res.data;
      
      if (!campaign || !campaign.subject || !campaign.htmlContent) {
        throw new Error("Invalid response from AI");
      }
      
      // Extract BODY content only - remove the Snapcart header/footer that AI might have generated
      // This ensures we only store the email body, not the wrapper
      let bodyContent: string = String(campaign.htmlContent ?? "")
        .replace(/\\n/g, '\n') // Unescape newlines for proper formatting in editor
        // Remove DOCTYPE and html/body tags
        .replace(/<!DOCTYPE[^>]*>/gi, '')
        .replace(/<\/?html[^>]*>/gi, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
        .replace(/<body[^>]*>/gi, '')
        .replace(/<\/body>/gi, '')
        // Remove style tags
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // Remove script tags
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .trim();
      
      // Format HTML for better readability with proper indentation
      const parts = bodyContent
        .split(/(<[^>]+>)/g)
        .filter((p: string) => p.trim());
      let indentLevel = 0;
      const selfClosingTags = /<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)[\s/>]/i;
      const blockTags = /^<\/?(?:div|p|ul|ol|li|h[1-6]|section|article|header|footer|nav|main|form|table|tbody|thead|tfoot|tr|td|th|blockquote|pre|address)/i;
      
      bodyContent = parts.map((part: string) => {
        const isTag = /^</.test(part);
        if (!isTag) return part.trim() ? '  '.repeat(indentLevel) + part.trim() : '';
        
        if (selfClosingTags.test(part)) {
          return '  '.repeat(indentLevel) + part;
        }
        
        const isClosing = /^<\//.test(part);
        const isBlock = blockTags.test(part);
        
        if (isClosing && isBlock) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
        
        const line = '  '.repeat(indentLevel) + part;
        
        if (!isClosing && isBlock) {
          indentLevel++;
        }
        
        return line;
      }).filter((line: string) => line.trim()).join('\n');
      
      // Extract plain text content for preview (preserve paragraph structure)
      let plainText = bodyContent
        .replace(/<br\s*\/?>/gi, '\n') // Convert br to newlines
        .replace(/<\/p>/gi, '\n') // Convert closing p tags to newlines
        .replace(/<[^>]+>/g, ' ') // Replace remaining tags with space
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && line !== 'Snapcart') // Filter empty lines and header
        .join('\n')
        .substring(0, 1200); // Increase to 1200 chars for more detail
      
      // Format date as DD/MM/YYYY
      const today = new Date();
      const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      
      // Pre-fill the campaign form with generated content
      setNewCampaign((prev) => ({
        ...prev,
        title: `${aiCampaign.campaignType.replace(/-/g, " ")} - ${formattedDate}`,
        subject: campaign.subject,
        content: plainText || campaign.subject,
        htmlContent: bodyContent, // Store BODY only, not full HTML with wrapper
      }));
      
      // Close generate modal and open create modal
      setShowGenerateModal(false);
      setShowCreateModal(true);
      toast.success("✨ Campaign generated successfully! Review and customize if needed.", { id: loadingToast });
    } catch (error: any) {
      console.error("Error generating campaign:", error);
      toast.error(error.response?.data?.message || "Failed to generate campaign. Please try again.", { id: loadingToast });
    } finally {
      setGeneratingCampaign(false);
    }
  }

  async function handleGenerateBulkEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!aiBulkEmail.topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setGeneratingBulkEmail(true);
    const loadingToast = toast.loading("🤖 Generating bulk email with AI...");

    try {
      const res = await axios.post("/api/admin/newsletter/generate-campaign", {
        campaignType: "bulk-email",
        topic: aiBulkEmail.topic,
        keywords: aiBulkEmail.keywords,
        tone: aiBulkEmail.tone,
        audience: "all-users",
      });

      if (!res.data.success) {
        toast.error(res.data.message || "Failed to generate email");
        return;
      }

      const { campaign } = res.data;

      let htmlBody: string = String(campaign.htmlContent ?? "").replace(/\\n/g, '\n');
      
      // Format HTML for better readability with proper indentation
      htmlBody = htmlBody
        .replace(/></g, '>\n<')
        .replace(/(<\/(?:div|p|ul|ol|li|h[1-6]|a|span)>)/gi, '$1\n');
      
      // Add proper indentation like ChatGPT/GitHub
      const bulkParts = htmlBody
        .split(/(<[^>]+>)/g)
        .filter((p: string) => p.trim());
      let bulkIndent = 0;
      const bulkSelfClosing = /<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)[\s/>]/i;
      const bulkBlockTags = /^<\/?(?:div|p|ul|ol|li|h[1-6]|section|article|header|footer|nav|main|form|table|tbody|thead|tfoot|tr|td|th|blockquote|pre|address)/i;
      
      htmlBody = bulkParts.map((part: string) => {
        const isTag = /^</.test(part);
        if (!isTag) return part.trim() ? '  '.repeat(bulkIndent) + part.trim() : '';
        
        if (bulkSelfClosing.test(part)) {
          return '  '.repeat(bulkIndent) + part;
        }
        
        const isClosing = /^<\//.test(part);
        const isBlock = bulkBlockTags.test(part);
        
        if (isClosing && isBlock) {
          bulkIndent = Math.max(0, bulkIndent - 1);
        }
        
        const line = '  '.repeat(bulkIndent) + part;
        
        if (!isClosing && isBlock) {
          bulkIndent++;
        }
        
        return line;
      }).filter((line: string) => line.trim()).join('\n');

      // Extract plain text from HTML
      const plainText = htmlBody
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();

      setBulkEmail({
        subject: campaign.subject,
        htmlContent: htmlBody,
        recipientType: "all-users",
      });

      setShowGenerateBulkModal(false);
      setShowBulkEmailModal(true);
      toast.success("✨ Email generated successfully! Review and send.", { id: loadingToast });
    } catch (error: any) {
      console.error("Error generating bulk email:", error);
      toast.error(error.response?.data?.message || "Failed to generate email. Please try again.", { id: loadingToast });
    } finally {
      setGeneratingBulkEmail(false);
    }
  }

  async function handleSendCampaign(campaignId: string) {
    await confirm({
      title: "Send Campaign",
      message: "Are you sure you want to send this campaign to all subscribers?",
      confirmText: "Send Now",
      isDangerous: true,
      onConfirm: async () => {
        try {
          setIsSendingCampaign(true);
          const res = await axios.post(`/api/admin/newsletter/campaigns/${campaignId}/send`);
          toast.success(res.data.message || "Campaign sent successfully!");
          loadData();
        } catch (error) {
          console.error("Error sending campaign:", error);
          toast.error("Failed to send campaign");
        } finally {
          setIsSendingCampaign(false);
        }
      },
    });
  }

  async function handleDeleteCampaign(campaignId: string) {
    await confirm({
      title: "Delete Campaign",
      message: "Are you sure you want to delete this campaign? This action cannot be undone.",
      confirmText: "Delete",
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await axios.delete(`/api/admin/newsletter/campaigns/${campaignId}`);
          toast.success(res.data.message || "Campaign deleted successfully!");
          loadData();
        } catch (error) {
          console.error("Error deleting campaign:", error);
          toast.error("Failed to delete campaign");
        }
      },
    });
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-100 text-gray-800",
      scheduled: "bg-blue-100 text-blue-800",
      sent: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Newsletter Management</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          {activeTab === "campaigns" && (
            <>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base"
              >
                <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
                Create Campaign
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base"
              >
                <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
                ✨ Generate with AI
              </button>
              <button
                onClick={() => setShowBulkEmailModal(true)}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center sm:justify-start gap-2 text-sm sm:text-base"
              >
                <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
                Bulk Email
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <nav className="flex gap-4 px-2 sm:px-0">
            {[
              { id: "overview", label: "Overview", icon: TrendingUp },
              { id: "subscribers", label: "Subscribers", icon: Users },
              { id: "campaigns", label: "Campaigns", icon: Mail },
              { id: "templates", label: "Templates", icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`shrink-0 py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-600 py-12">Loading...</p>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && stats && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <StatCard
                  title="Total Subscribers"
                  value={stats.subscribers.total}
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  title="Verified"
                  value={stats.subscribers.verified}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  title="Total Campaigns"
                  value={stats.campaigns.total}
                  icon={Mail}
                  color="purple"
                />
                <StatCard
                  title="Sent Campaigns"
                  value={stats.campaigns.sent}
                  icon={Send}
                  color="orange"
                />
                <StatCard
                  title="Total Templates"
                  value={stats.templates.total}
                  icon={FileText}
                  color="teal"
                />
              </div>

              {/* Recent Campaigns */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Campaigns</h2>
                <div className="space-y-3">
                  {stats.recentCampaigns.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No campaigns sent yet</p>
                  ) : (
                    stats.recentCampaigns.map((campaign, idx) => (
                      <div key={idx} className="border-b pb-3 last:border-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{campaign.title}</h3>
                            <p className="text-sm text-gray-500">
                              Sent to {campaign.recipientCount} subscribers on{" "}
                              {new Date(campaign.sentAt).toLocaleString("en-IN", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-gray-600">
                              Opens: {campaign.openCount} ({campaign.recipientCount > 0 ? Math.round((campaign.openCount / campaign.recipientCount) * 100) : 0}%)
                            </div>
                            <div className="text-gray-600">
                              Clicks: {campaign.clickCount}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Subscribers Tab */}
          {activeTab === "subscribers" && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subscribed At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unsubscribed At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subs.map((s) => (
                      <tr key={s.email}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {s.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {s.unsubscribedAt ? (
                            <span className="flex items-center text-red-600 text-sm">
                              <XCircle size={16} className="mr-1" /> Unsubscribed
                            </span>
                          ) : s.verified ? (
                            <span className="flex items-center text-green-600 text-sm">
                              <CheckCircle size={16} className="mr-1" /> Verified
                            </span>
                          ) : (
                            <span className="flex items-center text-yellow-600 text-sm">
                              <Clock size={16} className="mr-1" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {s.subscribedAt ? new Date(s.subscribedAt).toLocaleString() : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {s.unsubscribedAt ? new Date(s.unsubscribedAt).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === "campaigns" && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campaign
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipients
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {campaigns.map((c) => (
                      <tr key={c._id}>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{c.title}</div>
                            <div className="text-sm text-gray-500">{c.subject}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(c.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {c.recipientCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(c.createdAt).toLocaleString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            {(c.status === "draft" || c.status === "scheduled") && (
                              <>
                                <button
                                  onClick={() => handleEditCampaign(c._id)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit Campaign"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => handleSendCampaign(c._id)}
                                  disabled={isSendingCampaign}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  title="Send Campaign"
                                >
                                  {isSendingCampaign ? (
                                    <>
                                      <Loader size={18} className="animate-spin" />
                                      <span className="text-xs">Sending...</span>
                                    </>
                                  ) : (
                                    <Send size={18} />
                                  )}
                                </button>
                              </>
                            )}
                            {c.status !== "sent" && (
                              <button
                                onClick={() => handleDeleteCampaign(c._id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete Campaign"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                            {c.status === "sent" && (
                              <button
                                onClick={() => setPreviewCampaign(c)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Campaign"
                              >
                                <Eye size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {campaigns.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No campaigns yet. Create your first campaign!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <FileText className="text-green-600" size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">Subject: {template.subject}</p>
                  <button
                    onClick={() => {
                      handleTemplateSelect(template.id);
                      setShowCreateModal(true);
                    }}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Use Template
                  </button>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No templates available
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {editingCampaignId ? "Edit Campaign" : "Create New Campaign"}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingCampaignId(null);
                }}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              {/* Template Selector */}
              {templates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Template (Optional)
                  </label>
                  <select
                    value={newCampaign.selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">-- Start from scratch --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={newCampaign.title}
                  onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content (Plain Text)
                </label>
                <textarea
                  value={newCampaign.content}
                  onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HTML Content (Rich Editor)
                </label>
                <HtmlEditor
                  value={newCampaign.htmlContent}
                  onChange={(value) => setNewCampaign({ ...newCampaign, htmlContent: value })}
                  placeholder="Write your email content with formatting..."
                  height="300px"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Use the editor toolbar to format your content. This will be sent as the main email body.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Send To
                </label>
                <select
                  value={newCampaign.sentTo}
                  onChange={(e) => setNewCampaign({ ...newCampaign, sentTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="verified">Newsletter Subscribers (Verified Only)</option>
                  <option value="all">All Newsletter Subscribers</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Only sends to newsletter subscribers. Use "Bulk Email" button for all users.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={newCampaign.scheduledAt}
                  onChange={(e) => setNewCampaign({ ...newCampaign, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to save as draft
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                >
                  {editingCampaignId ? "Update Campaign" : "Create Campaign"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCampaignId(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Email Modal */}
      {showBulkEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Send Bulk Email</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkEmailModal(false);
                    setShowGenerateBulkModal(true);
                  }}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm font-medium flex items-center gap-2"
                >
                  ✨ Generate with AI
                </button>
                <button
                  onClick={() => setShowBulkEmailModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-2"
                >
                  ✕
                </button>
              </div>
            </div>
            <form onSubmit={handleBulkEmail} className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>⚠️ Important:</strong> Bulk emails are sent to ALL users in the system, 
                  not just newsletter subscribers. Use this feature carefully for important announcements.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipients
                </label>
                <select
                  value={bulkEmail.recipientType}
                  onChange={(e) => setBulkEmail({ ...bulkEmail, recipientType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="all-users">All Registered Users</option>
                  <option value="verified-subscribers">Newsletter Subscribers (Verified)</option>
                  <option value="all-subscribers">All Newsletter Subscribers</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={bulkEmail.subject}
                  onChange={(e) => setBulkEmail({ ...bulkEmail, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HTML Content (Rich Editor)
                </label>
                <HtmlEditor
                  value={bulkEmail.htmlContent}
                  onChange={(value) => setBulkEmail({ ...bulkEmail, htmlContent: value })}
                  placeholder="Write your email content with formatting..."
                  height="350px"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Use the editor toolbar to format your content. This will be sent to all selected recipients.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Send Bulk Email
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkEmailModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Bulk Email Generation Modal */}
      {showGenerateBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">✨ Generate Bulk Email with AI</h2>
              <button
                onClick={() => setShowGenerateBulkModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateBulkEmail} className="space-y-4">
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-4">
                <p className="text-sm text-purple-700">
                  <strong>✨ AI Assistant:</strong> Enter your email details and let our AI generate professional content for your bulk email!
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                <button
                  type="button"
                  onClick={() => setShowHints(!showHints)}
                  className="w-full flex items-center justify-between text-left font-semibold text-blue-900 hover:text-blue-700"
                >
                  <span className="flex items-center gap-2">
                    <span>📝 How to Fill This Form:</span>
                  </span>
                  <span className={`text-xl transition-transform duration-200 ${showHints ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                
                {showHints && (
                  <div className="space-y-2 text-sm text-blue-800 mt-4 pt-4 border-t border-blue-200">
                    <div className="flex gap-2">
                      <span className="font-mono bg-blue-200 px-2 py-1 rounded text-xs font-bold">1</span>
                      <div>
                        <p className="font-medium">Enter Topic (Required) ⭐</p>
                        <p className="text-xs text-blue-700">Be specific: "Weekend special offers 50% off" works better than just "offers"</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-mono bg-blue-200 px-2 py-1 rounded text-xs font-bold">2</span>
                      <div>
                        <p className="font-medium">Add Keywords (Optional)</p>
                        <p className="text-xs text-blue-700">Add relevant terms like "fresh, organic, discount, free delivery"</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-mono bg-blue-200 px-2 py-1 rounded text-xs font-bold">3</span>
                      <div>
                        <p className="font-medium">Select Tone</p>
                        <p className="text-xs text-blue-700">Choose based on your message: urgent for flash sales, friendly for updates</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-mono bg-blue-200 px-2 py-1 rounded text-xs font-bold">4</span>
                      <div>
                        <p className="font-medium">Click Generate ✨</p>
                        <p className="text-xs text-blue-700">AI will create subject + content. You can review and edit before sending!</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📝 Topic or Message
                </label>
                <input
                  type="text"
                  value={aiBulkEmail.topic}
                  onChange={(e) => setAiBulkEmail({ ...aiBulkEmail, topic: e.target.value })}
                  placeholder="e.g., Special weekend offers, seasonal promotions, product launch..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🏷️ Keywords (Optional)
                </label>
                <input
                  type="text"
                  value={aiBulkEmail.keywords}
                  onChange={(e) => setAiBulkEmail({ ...aiBulkEmail, keywords: e.target.value })}
                  placeholder="e.g., fresh, organic, discount, limited time..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  🎯 Tone
                </label>
                <select
                  value={aiBulkEmail.tone}
                  onChange={(e) => setAiBulkEmail({ ...aiBulkEmail, tone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="urgent">Urgent/Promotional</option>
                  <option value="casual">Casual</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={generatingBulkEmail}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generatingBulkEmail ? "🤖 Generating..." : "✨ Generate Email"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerateBulkModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Campaign Generation Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">✨ Generate Campaign with AI</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-4">
              <p className="text-sm text-purple-700">
                <strong>✨ AI Assistant:</strong> Enter your campaign details and let our AI generate a professional email subject and content for you!
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <button
                type="button"
                onClick={() => setShowHints(!showHints)}
                className="w-full flex items-center justify-between text-left font-semibold text-blue-900 hover:text-blue-700"
              >
                <span className="flex items-center gap-2">
                  <span>📝 How to Fill This Form:</span>
                </span>
                <span className={`text-xl transition-transform duration-200 ${showHints ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              
              {showHints && (
                <div className="space-y-2 text-sm text-blue-800 mt-4 pt-4 border-t border-blue-200">
                  <div className="flex gap-2">
                    <span className="font-mono bg-blue-200 px-2 py-1 rounded text-xs font-bold">1</span>
                    <div>
                      <p className="font-medium">Choose Campaign Type</p>
                      <p className="text-xs text-blue-700">Select from Weekly Deals, Product Launch, Seasonal Sale, etc.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono bg-blue-200 px-2 py-1 rounded text-xs font-bold">2</span>
                    <div>
                      <p className="font-medium">Enter Topic (Required) ⭐</p>
                      <p className="text-xs text-blue-700">Be specific: "Fresh organic vegetables 40% off" works better than just "sale"</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono bg-blue-200 px-2 py-1 rounded text-xs font-bold">3</span>
                    <div>
                      <p className="font-medium">Add Keywords (Optional)</p>
                      <p className="text-xs text-blue-700">Use 3-5 keywords separated by commas: "organic, fresh, eco-friendly"</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono bg-blue-200 px-2 py-1 rounded text-xs font-bold">4</span>
                    <div>
                      <p className="font-medium">Pick Tone & Audience</p>
                      <p className="text-xs text-blue-700">Match your brand voice: Promotional for sales, Informative for launches</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono bg-blue-200 px-2 py-1 rounded text-xs font-bold">5</span>
                    <div>
                      <p className="font-medium">Click Generate & Wait 2-5 seconds</p>
                      <p className="text-xs text-blue-700">AI will create subject line and HTML email content automatically</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleGenerateWithAI} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Type
                </label>
                <select
                  value={aiCampaign.campaignType}
                  onChange={(e) => setAiCampaign({ ...aiCampaign, campaignType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="weekly-deals">Weekly Deals</option>
                  <option value="product-launch">Product Launch</option>
                  <option value="seasonal-sale">Seasonal Sale</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="announcement">Announcement</option>
                  <option value="recipe-tips">Recipe Tips</option>
                  <option value="welcome">Welcome Series</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic / Main Message *
                </label>
                <input
                  type="text"
                  value={aiCampaign.topic}
                  onChange={(e) => setAiCampaign({ ...aiCampaign, topic: e.target.value })}
                  placeholder="e.g., 'Fresh Organic Vegetables Sale', 'New Product Launch: Dairy-Free Options'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords (Comma separated)
                </label>
                <input
                  type="text"
                  value={aiCampaign.keywords}
                  onChange={(e) => setAiCampaign({ ...aiCampaign, keywords: e.target.value })}
                  placeholder="e.g., 'organic, fresh, eco-friendly, discount'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tone
                </label>
                <select
                  value={aiCampaign.tone}
                  onChange={(e) => setAiCampaign({ ...aiCampaign, tone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual & Friendly</option>
                  <option value="promotional">Promotional & Exciting</option>
                  <option value="informative">Informative & Educational</option>
                  <option value="urgent">Urgent & Time-Sensitive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience
                </label>
                <select
                  value={aiCampaign.audience}
                  onChange={(e) => setAiCampaign({ ...aiCampaign, audience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="grocery-customers">General Grocery Customers</option>
                  <option value="health-conscious">Health Conscious Shoppers</option>
                  <option value="budget-conscious">Budget Conscious Shoppers</option>
                  <option value="organic-lovers">Organic/Eco-Friendly Lovers</option>
                  <option value="families">Families with Kids</option>
                  <option value="premium-customers">Premium/VIP Customers</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={generatingCampaign}
                  className={`flex-1 text-white py-2 px-4 rounded-md flex items-center justify-center gap-2 ${
                    generatingCampaign
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-purple-600 hover:bg-purple-700"
                  }`}
                >
                  {generatingCampaign ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      ✨ Generate Campaign
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Campaign Preview Modal */}
      {previewCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">{previewCampaign.title}</h2>
                <p className="text-gray-600">Subject: {previewCampaign.subject}</p>
              </div>
              <button
                onClick={() => setPreviewCampaign(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-gray-600">Sent To</p>
                <p className="font-semibold capitalize">{previewCampaign.sentTo}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-gray-600">Recipients</p>
                <p className="font-semibold">{previewCampaign.recipientCount}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <p className="text-sm text-gray-600">Sent At</p>
                <p className="font-semibold">{previewCampaign.sentAt ? new Date(previewCampaign.sentAt).toLocaleDateString() : "—"}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-4">Email Preview</h3>
              <iframe
                srcDoc={previewCampaign.htmlContent || previewCampaign.content}
                className="w-full border rounded bg-white"
                style={{ height: "500px" }}
                title="Campaign Preview"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {ConfirmationModal}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: any;
  color: "blue" | "green" | "purple" | "orange" | "teal";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
    teal: "bg-teal-100 text-teal-700",
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 min-h-[92px]">
        <div className="flex flex-col justify-center gap-1 leading-[1.2] h-full">
          <p className="text-sm text-gray-600 whitespace-pre-line break-words text-left leading-[1.25]">{title}</p>
          <p className="text-2xl font-bold leading-[1.2] text-left">{value}</p>
        </div>
        <div className={`p-2.5 rounded-full ${colors[color]} flex items-center justify-center`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
