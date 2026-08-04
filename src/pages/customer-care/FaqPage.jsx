import React from 'react';
import PolicyPageShell from '../../components/PolicyPageShell';
import Seo from '../../components/Seo';

export default function FaqPage() {
  return (
    <>
      <Seo
        title="Frequently Asked Questions"
        description="Answers to common questions about ZUNUZ orders, shipping, returns, and payments."
        path="/customer-care/faq"
      />
      <PolicyPageShell title="FAQ" />
    </>
  );
}
