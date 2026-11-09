import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { ArrowIcon } from "@/components/icons";
import { Eyebrow } from "@/components/public-ui";
import type { StorefrontConfig } from "@/lib/storefront/types";
import { storefrontPath } from "@/lib/storefront/types";

function TitleLines({ lines }: { lines: readonly string[] }) {
  return lines.map((line, index) => <Fragment key={line}>{index > 0 && <br />}{line}</Fragment>);
}

function StorefrontHero({ storefront }: { storefront: StorefrontConfig }) {
  const { hero } = storefront.content;
  return (
    <section className="site-container store-hero">
      <div>
        <Eyebrow>{hero.eyebrow}</Eyebrow>
        <h1><TitleLines lines={hero.titleLines} /><br /><span className="text-silver">{hero.titleAccent}</span></h1>
        <p className="hero-description">{hero.description}</p>
        <div className="hero-actions">
          <a className="button button-blue" href={storefront.contact.whatsappUrl} target="_blank" rel="noopener noreferrer">{hero.contactLabel} <ArrowIcon diagonal /></a>
          <Link className="text-link" href={`${storefrontPath(storefront.slug)}#catalogo`}>{hero.catalogLabel} <ArrowIcon /></Link>
        </div>
      </div>
      <div className="store-art" aria-hidden="true">
        <div className="store-orbit orbit-one" /><div className="store-orbit orbit-two" />
        <div className="store-art-center">
          <Image src={storefront.identity.logo.src} alt="" width={100} height={100} />
          <span>{storefront.identity.name}</span><small>{storefront.identity.caption}</small>
        </div>
        <span className="orbit-label label-top">{hero.artLabels[0]}</span>
        <span className="orbit-label label-bottom">{hero.artLabels[1]}</span>
      </div>
    </section>
  );
}

function StorefrontCatalogNotice({ storefront }: { storefront: StorefrontConfig }) {
  const { catalog } = storefront.content;
  return (
    <section className="site-container section-space store-catalog" id="catalogo">
      <div><Eyebrow>{catalog.eyebrow}</Eyebrow><h2>{catalog.title}<br /><span className="text-muted">{catalog.titleAccent}</span></h2></div>
      <div className="vision-copy">
        <p className="lead">{catalog.lead}</p>
        {catalog.paragraphs.map(text => <p key={text}>{text}</p>)}
        <a className="text-link" href={storefront.contact.whatsappUrl} target="_blank" rel="noopener noreferrer">{catalog.contactLabel} <ArrowIcon diagonal /></a>
      </div>
    </section>
  );
}

function StorefrontSteps({ storefront }: { storefront: StorefrontConfig }) {
  const { steps } = storefront.content;
  return (
    <section className="store-steps" id="como-funciona">
      <div className="site-container section-space">
        <div className="section-heading-row">
          <div><Eyebrow>{steps.eyebrow}</Eyebrow><h2><TitleLines lines={steps.titleLines} /></h2></div>
          <p className="section-aside">{steps.description}</p>
        </div>
        <div className="steps-grid">{steps.items.map(step => (
          <article key={step.number}><span className="feature-number">{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></article>
        ))}</div>
      </div>
    </section>
  );
}

function StorefrontContact({ storefront }: { storefront: StorefrontConfig }) {
  const { contact } = storefront.content;
  return (
    <section className="site-container section-space store-contact" id="contacto">
      <div><Eyebrow>{contact.eyebrow}</Eyebrow><h2>{contact.title}<br /><span className="text-silver">{contact.titleAccent}</span></h2><p>{contact.description}</p></div>
      <a className="button button-silver" href={storefront.contact.whatsappUrl} target="_blank" rel="noopener noreferrer">{contact.label} <ArrowIcon diagonal /></a>
    </section>
  );
}

export function WholesaleTemplate({ storefront }: { storefront: StorefrontConfig }) {
  return (
    <>
      <StorefrontHero storefront={storefront} />
      <div className="principle-band"><div className="site-container">{storefront.content.highlights.map(text => <span key={text}>{text}</span>)}</div></div>
      <StorefrontCatalogNotice storefront={storefront} />
      <StorefrontSteps storefront={storefront} />
      <StorefrontContact storefront={storefront} />
    </>
  );
}
