Config = {}

Config.RequireDiscordIdentifier = true -- If true, the webstore will be non-interactable unless the user has a discord identifier. They will be instructed on this and how to fix it.

Config.RequireFiveMIdentifier = true -- If true, the webstore will be non-interactable unless the user has a FiveM identifier. They will be instructed on this and how to fix it.

Config.CustomPages = {
    {
        label = "Terms of Service",
        content = [[
            <div>
                <div className="font-bold text-xl">Terms of Service</div>
                <div className="text-zinc-600">Last updated: 01/17/2025</div>
                <div className="font-bold text-md">Section 1: General Agreements</div>
                <ol className="list-decimal ml-6">
                    <li>By using this store you agree to all sections and terms within the Terms of Service (this agreement).</li>
                </ol>
                <div className="font-bold text-md">Section 2: Tebex / Store Agreements</div>
                <ol className="list-decimal ml-6">
                    <li>You agree to the Tebex Terms of Service and Privacy Policy.</li>
                    <li>Products purchased are as-is, and the asset&apos;s creator(s) hold no liability for damages, maintainence, or providance of products or services is waived.</li>
                    <li>There are no refunds for any reason, however the asset&apos;s creator may waive this and process a refund at-will of the creator(s).</li>
                </ol>
            </div>   
        ]]
    }
}