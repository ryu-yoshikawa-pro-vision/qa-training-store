import type { ReactNode } from "react";
import {
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
} from "react-aria-components";

interface ConfirmDialogProps {
  triggerLabel: string;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  triggerLabel,
  title,
  children,
  confirmLabel,
  onConfirm,
  danger = false,
}: ConfirmDialogProps) {
  return (
    <DialogTrigger>
      <AriaButton className="button button--secondary">{triggerLabel}</AriaButton>
      <ModalOverlay className="dialog-overlay" isDismissable>
        <Modal className="dialog-modal">
          <Dialog className="dialog" role="alertdialog">
            {({ close }) => (
              <>
                <Heading slot="title">{title}</Heading>
                <div>{children}</div>
                <div className="dialog__actions">
                  <AriaButton
                    className={`button button--${danger ? "danger" : "primary"}`}
                    onPress={() => {
                      onConfirm();
                      close();
                    }}
                  >
                    {confirmLabel}
                  </AriaButton>
                  <AriaButton className="button button--secondary" onPress={close}>
                    {content.action.close}
                  </AriaButton>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}

import { content } from "@/presentation/content/dictionary";
