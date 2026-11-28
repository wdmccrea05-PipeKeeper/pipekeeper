import React, { useRef, useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n/safeTranslation";

const POST_TYPES = [
  { value: 'note', key: 'communityFeed.typeNote', label: 'Update' },
  { value: 'acquisition', key: 'communityFeed.typeAcquisition', label: 'New acquisition' },
  { value: 'session', key: 'communityFeed.typeSession', label: 'Session' },
  { value: 'photo', key: 'communityFeed.typePhoto', label: 'Photo' },
];

const MODULES = [
  { value: 'general', key: 'communityFeed.moduleGeneral', label: 'General' },
  { value: 'pipe', key: 'communityFeed.modulePipe', label: 'Pipes' },
  { value: 'tobacco', key: 'communityFeed.moduleTobacco', label: 'Tobacco' },
  { value: 'whiskey', key: 'communityFeed.moduleWhiskey', label: 'Whiskey' },
  { value: 'cigar', key: 'communityFeed.moduleCigar', label: 'Cigars' },
  { value: 'wine', key: 'communityFeed.moduleWine', label: 'Wine' },
];

export default function PostComposer({ user, profile, onPosted }) {
  const { t } = useTranslation();
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [postType, setPostType] = useState('note');
  const [moduleType, setModuleType] = useState('general');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);

  const displayName = profile?.display_name || user?.full_name || user?.email || '';

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files.slice(0, 4 - photos.length)) {
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        uploaded.push(file_url);
      }
      setPhotos((prev) => [...prev, ...uploaded].slice(0, 4));
    } catch {
      toast.error(t('communityFeed.photoUploadFailed', 'Could not upload that photo'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async () => {
    if (!body.trim() || !user?.email) return;
    setPosting(true);
    try {
      await base44.entities.CommunityPost.create({
        author_email: user.email,
        author_name: displayName,
        author_avatar: profile?.avatar_url || '',
        post_type: postType,
        module_type: moduleType,
        title: title.trim(),
        body: body.trim(),
        photos,
      });
      setBody('');
      setTitle('');
      setPhotos([]);
      setPostType('note');
      setModuleType('general');
      toast.success(t('communityFeed.posted', 'Shared with the community'));
      onPosted?.();
    } catch {
      toast.error(t('communityFeed.postFailed', 'Could not publish your post'));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "linear-gradient(145deg, rgba(54,58,60, 0.78), rgba(45,48,50, 0.90))",
        border: "1px solid rgba(120, 90, 65, 0.32)",
        boxShadow: "0 3px 10px rgba(0,0,0,0.55), inset 0 1px 0 rgba(180,140,100,0.1)"
      }}
    >
      <div className="p-4 sm:p-5">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="bg-[#705d39] text-[#E0D8C8] text-sm">
              {displayName?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('communityFeed.titlePlaceholder', 'Headline (optional)')}
              maxLength={120}
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('communityFeed.bodyPlaceholder', 'What are you enjoying, adding or discovering?')}
              rows={3}
              maxLength={2000}
            />

            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photos.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-md" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((p) => p !== url))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: '#3b4042', border: '1px solid rgba(180,140,75,0.4)', color: '#E0D8C8' }}
                      aria-label={t('communityFeed.removePhoto', 'Remove photo')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Select value={postType} onValueChange={setPostType}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(type.key, type.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={moduleType} onValueChange={setModuleType}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map((module) => (
                    <SelectItem key={module.value} value={module.value}>
                      {t(module.key, module.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading || photos.length >= 4}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-1" />}
                {t('communityFeed.addPhoto', 'Photo')}
              </Button>

              <Button
                type="button"
                size="sm"
                className="ml-auto"
                disabled={posting || !body.trim()}
                onClick={submit}
              >
                {posting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                {t('communityFeed.post', 'Post')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}