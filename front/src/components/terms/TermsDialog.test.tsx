import { fireEvent, render, screen } from "@testing-library/react";
import { INSTITUTION_TERMS_VERSION } from "@/lib/consent/institutionTerms";
import { formatNoticeVersion } from "@/lib/consent/privacyNotice";
import { TermsDialog } from "./TermsDialog";

describe("TermsDialog", () => {
  it("renders nothing while closed", () => {
    render(<TermsDialog open={false} onClose={jest.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the terms with an accessible name", () => {
    render(<TermsDialog open onClose={jest.fn()} />);

    expect(
      screen.getByRole("dialog", { name: "Termos de Uso" }),
    ).toBeInTheDocument();
  });

  it("shows the version the reader is being shown", () => {
    // The stored consent record names a version; the text on screen has to
    // say the same one, or the record describes something nobody saw.
    render(<TermsDialog open onClose={jest.fn()} />);

    expect(
      screen.getByText(
        new RegExp(
          `Painel institucional · Versão\\s*${formatNoticeVersion(
            INSTITUTION_TERMS_VERSION,
          )}`,
        ),
      ),
    ).toBeInTheDocument();
  });

  it("discloses the public repository", () => {
    // Part of the text an institution is agreeing to, so it must survive
    // edits: dropping it silently would leave accounts consenting to a
    // version whose disclosures no longer match what they were shown.
    render(<TermsDialog open onClose={jest.fn()} />);

    const link = screen.getByRole("link", {
      name: /github\.com\/Labs-de-Games\/guardiao-da-cultura/,
    });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/Labs-de-Games/guardiao-da-cultura",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("says the repository holds no institutional data", () => {
    render(<TermsDialog open onClose={jest.fn()} />);

    expect(
      screen.getByText(/nada de cadastro, credencial ou dado de uso/),
    ).toBeInTheDocument();
  });

  it("carries the pending-legal-review marker", () => {
    render(<TermsDialog open onClose={jest.fn()} />);

    expect(
      screen.getByText(/Rascunho sujeito a revisão jurídica/),
    ).toBeInTheDocument();
  });

  it("closes from the footer button", () => {
    const onClose = jest.fn();
    render(<TermsDialog open onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from the corner icon", () => {
    const onClose = jest.fn();
    render(<TermsDialog open onClose={onClose} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Fechar os Termos de Uso" }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    // Unlike the game's ConsentGate, Escape is allowed here: closing the
    // terms decides nothing, so there is no default answer to guard against.
    const onClose = jest.fn();
    render(<TermsDialog open onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape",
      code: "Escape",
    });

    expect(onClose).toHaveBeenCalled();
  });

  it("has exactly one heading, not a nested document", () => {
    // TermsContent deliberately omits the title so the dialog's own title is
    // the only h1-level heading a screen reader announces for the document.
    render(<TermsDialog open onClose={jest.fn()} />);

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).length).toBeGreaterThan(
      1,
    );
  });
});
