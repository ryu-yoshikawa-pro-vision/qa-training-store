import { useRef, useState, type ReactNode } from "react";
import {
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  type DialogRenderProps,
} from "react-aria-components";
import { content } from "@/presentation/content/dictionary";

interface ConfirmDialogProps {
  triggerLabel: string;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
}

export function ConfirmDialog({
  triggerLabel,
  title,
  children,
  confirmLabel,
  onConfirm,
  danger = false,
  disabled = false,
}: ConfirmDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const confirmingRef = useRef(false);

  return (
    <DialogTrigger>
      <AriaButton
        className={`button button--${danger ? "danger" : "secondary"}`}
        isDisabled={disabled || confirming}
      >
        {triggerLabel}
      </AriaButton>
      <ModalOverlay className="dialog-overlay" isDismissable>
        <Modal className="dialog-modal confirm-dialog-modal">
          <Dialog className="dialog confirm-dialog" role="alertdialog">
            {({ close }: DialogRenderProps) => (
              <>
                <Heading slot="title">{title}</Heading>
                <div className="dialog__body">{children}</div>
                <div className="dialog__actions">
                  <AriaButton
                    className={`button button--${danger ? "danger" : "primary"}`}
                    isDisabled={disabled || confirming}
                    onPress={() => {
                      if (confirmingRef.current) return;
                      confirmingRef.current = true;
                      setConfirming(true);
                      void Promise.resolve()
                        .then(() => onConfirm())
                        .then(
                          () => close(),
                          () => undefined,
                        )
                        .finally(() => {
                          confirmingRef.current = false;
                          setConfirming(false);
                        });
                    }}
                  >
                    {confirmLabel}
                  </AriaButton>
                  <AriaButton
                    className="button button--secondary"
                    isDisabled={confirming}
                    onPress={close}
                  >
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
