import MetaTags from '@components/Common/MetaTags';
import MessageHeader from '@components/Messages/MessageHeader';
import Loader from '@components/Shared/Loader';
import useGetMessages from '@components/utils/hooks/useGetMessages';
import { useGetProfile } from '@components/utils/hooks/useMessageDb';
import useSendMessage from '@components/utils/hooks/useSendMessage';
import useStreamMessages from '@components/utils/hooks/useStreamMessages';
import { APP_NAME } from '@lenster/data/constants';
import formatHandle from '@lenster/lib/formatHandle';
import sanitizeDisplayName from '@lenster/lib/sanitizeDisplayName';
import { Card, GridItemEight, GridLayout } from '@lenster/ui';
import { parseConversationKey } from '@lib/conversationKey';
import { Leafwatch } from '@lib/leafwatch';
import { t } from '@lingui/macro';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import type { FC } from 'react';
import { useCallback, useState } from 'react';
import Custom404 from 'src/pages/404';
import { useAppStore } from 'src/store/app';
import { useMessageStore } from 'src/store/message';
import { PAGEVIEW } from 'src/tracking';
import { useEffectOnce } from 'usehooks-ts';

import Composer from './Composer';
import MessagesList from './MessagesList';
import PreviewList from './PreviewList';

interface MessageProps {
  conversationKey: string;
}

const Message: FC<MessageProps> = ({ conversationKey }) => {
  const currentProfile = useAppStore((state) => state.currentProfile);
  const { profile } = useGetProfile(currentProfile?.id, conversationKey);
  const selectedConversation = useMessageStore((state) =>
    state.conversations.get(conversationKey)
  );
  const [endTime, setEndTime] = useState<Map<string, Date>>(new Map());
  const { messages, hasMore } = useGetMessages(
    conversationKey,
    selectedConversation,
    endTime.get(conversationKey)
  );
  useStreamMessages(conversationKey, selectedConversation);
  const { missingXmtpAuth, sendMessage } = useSendMessage(conversationKey);

  const fetchNextMessages = useCallback(() => {
    if (hasMore && Array.isArray(messages) && messages.length > 0) {
      const lastMsgDate = messages[messages.length - 1].sent;
      const currentEndTime = endTime.get(conversationKey);
      if (!currentEndTime || lastMsgDate <= currentEndTime) {
        endTime.set(conversationKey, lastMsgDate);
        setEndTime(new Map(endTime));
      }
    }
  }, [conversationKey, hasMore, messages, endTime]);

  if (!currentProfile) {
    return <Custom404 />;
  }

  const showLoading = !missingXmtpAuth && !currentProfile;

  const userNameForTitle =
    sanitizeDisplayName(profile?.name) ?? formatHandle(profile?.handle);

  const title = userNameForTitle
    ? `${userNameForTitle} • ${APP_NAME}`
    : APP_NAME;

  return (
    <GridLayout classNameChild="md:gap-8">
      <MetaTags title={title} />
      <PreviewList
        className="xs:hidden sm:hidden md:hidden lg:block"
        selectedConversationKey={conversationKey}
      />
      <GridItemEight className="xs:mx-2 relative mb-0 sm:mx-2 md:col-span-8">
        <Card className="flex h-[87vh] flex-col justify-between">
          {showLoading ? (
            <div className="flex h-full grow items-center justify-center">
              <Loader message={t`Loading messages`} />
            </div>
          ) : (
            <>
              <MessageHeader
                profile={profile}
                conversationKey={conversationKey}
              />
              <MessagesList
                conversationKey={conversationKey}
                currentProfile={currentProfile}
                profile={profile}
                fetchNextMessages={fetchNextMessages}
                messages={messages ?? []}
                hasMore={hasMore}
                missingXmtpAuth={missingXmtpAuth ?? false}
              />
              <Composer
                sendMessage={sendMessage}
                conversationKey={conversationKey}
                disabledInput={missingXmtpAuth ?? false}
              />
            </>
          )}
        </Card>
      </GridItemEight>
    </GridLayout>
  );
};

const MessagePage: NextPage = () => {
  const currentProfileId = useAppStore((state) => state.currentProfile?.id);
  const {
    query: { conversationKey }
  } = useRouter();

  useEffectOnce(() => {
    Leafwatch.track(PAGEVIEW, { page: 'conversation' });
  });

  // Need to have a login page for when there is no currentProfileId
  if (
    !conversationKey ||
    !currentProfileId ||
    !Array.isArray(conversationKey)
  ) {
    return <Custom404 />;
  }

  const joinedConversationKey = conversationKey.join('/');
  const parsed = parseConversationKey(joinedConversationKey);

  if (!parsed) {
    return <Custom404 />;
  }

  const { members } = parsed;
  const profileId = members.find((member) => member !== currentProfileId);

  if (members.length > 1 && !profileId) {
    return <Custom404 />;
  }

  return <Message conversationKey={joinedConversationKey} />;
};

export default MessagePage;
